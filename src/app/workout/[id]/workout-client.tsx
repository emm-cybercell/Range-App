"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Minus, Plus, SkipForward, Trash2, X } from "lucide-react";
import { addSetAction, deleteSetAction, finishWorkoutAction, toggleSkipAction, updateSetAction } from "../actions";
import { nowMs } from "@/lib/date";

type SetRow = { id: string; setIndex: number; weightKg: number; reps: number; isWarmup: boolean };

export type ExerciseBlock = {
  id: string;
  name: string;
  muscle: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  status: "PENDING" | "DONE" | "SKIPPED";
  sets: SetRow[];
  last: { date: string; sets: { weightKg: number; reps: number; isWarmup: boolean }[] } | null;
};

type Props = {
  sessionId: string;
  planName: string;
  dayName: string;
  initialElapsedSec: number;
  exercises: ExerciseBlock[];
};

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** 用 Web Audio 合成提示音，不依赖音频文件 */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1180;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // 浏览器不支持或被拦截时静默降级，不影响记录
  }
}

export function WorkoutClient({ sessionId, planName, dayName, initialElapsedSec, exercises }: Props) {
  const router = useRouter();

  const [elapsed, setElapsed] = useState(initialElapsedSec);
  const [blocks, setBlocks] = useState<ExerciseBlock[]>(exercises);
  const [openId, setOpenId] = useState<string | null>(
    exercises.find((e) => e.status === "PENDING")?.id ?? exercises[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<Record<string, { weight: string; reps: string }>>({});
  const [finishing, setFinishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 组间休息：只存结束时间，UI 每次按真实时间差算剩余，切后台也不会漂
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [restLeft, setRestLeft] = useState(0);

  // 计时以服务端 startedAt 为准，每秒推进
  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      setRestLeft(Math.max(0, Math.ceil((rest.endsAt - nowMs()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [rest]);

  useEffect(() => {
    if (!rest || restLeft > 0) return;
    beep();
    const t = setTimeout(() => setRest(null), 1500);
    return () => clearTimeout(t);
  }, [rest, restLeft]);

  function startRest(seconds: number) {
    if (seconds <= 0) return;
    setRest({ total: seconds, endsAt: nowMs() + seconds * 1000 });
    setRestLeft(seconds);
  }

  function adjustRest(delta: number) {
    setRest((r) =>
      r ? { total: Math.max(5, r.total + delta), endsAt: r.endsAt + delta * 1000 } : null,
    );
    setRestLeft((v) => Math.max(0, v + delta));
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const totalDone = useMemo(() => blocks.reduce((n, b) => n + b.sets.length, 0), [blocks]);
  const totalVolume = useMemo(
    () => blocks.reduce((sum, b) => sum + b.sets.reduce((s, x) => s + x.weightKg * x.reps, 0), 0),
    [blocks],
  );

  function placement(block: ExerciseBlock) {
    const value = draft[block.id] ?? { weight: "", reps: "" };
    const lastSet = block.sets.at(-1);
    const lastFromHistory = block.last?.sets.at(-1);
    const w = value.weight !== "" ? Number(value.weight) : (lastSet?.weightKg ?? lastFromHistory?.weightKg ?? 0);
    const r = value.reps !== "" ? Number(value.reps) : (lastSet?.reps ?? lastFromHistory?.reps ?? block.repsMin);
    return { w, r };
  }

  async function submitSet(block: ExerciseBlock) {
    const { w, r } = placement(block);
    if (r <= 0) {
      setToast("次数至少 1 次");
      return;
    }

    const tempId = `temp-${nowMs()}`;
    const optimistic: SetRow = {
      id: tempId,
      setIndex: block.sets.length + 1,
      weightKg: w,
      reps: r,
      isWarmup: false,
    };

    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, sets: [...b.sets, optimistic] } : b)));
    setDraft((prev) => ({ ...prev, [block.id]: { weight: "", reps: "" } }));

    const result = await addSetAction({
      workoutExerciseId: block.id,
      weightKg: w,
      reps: r,
    });

    if (!result.ok) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, sets: b.sets.filter((s) => s.id !== tempId) } : b)),
      );
      setToast(result.message);
      return;
    }

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === block.id
          ? { ...b, sets: b.sets.map((s) => (s.id === tempId ? result.set : s)) }
          : b,
      ),
    );

    startRest(block.restSec);
  }
  async function commitSet(block: ExerciseBlock, set: SetRow, weightKg: number, reps: number) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === block.id
          ? { ...b, sets: b.sets.map((s) => (s.id === set.id ? { ...s, weightKg, reps } : s)) }
          : b,
      ),
    );
    const result = await updateSetAction({ setId: set.id, weightKg, reps });
    if (!result.ok) setToast(result.message);
  }

  async function removeSet(block: ExerciseBlock, setId: string) {
    const snapshot = block.sets;
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, sets: b.sets.filter((s) => s.id !== setId) } : b)),
    );
    const result = await deleteSetAction(setId);
    if (!result.ok) {
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, sets: snapshot } : b)));
      setToast(result.message);
    }
  }

  async function skip(block: ExerciseBlock) {
    const result = await toggleSkipAction(block.id);
    if (!result.ok) {
      setToast(result.message);
      return;
    }
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, status: result.status as ExerciseBlock["status"] } : b)),
    );
  }

  async function finish() {
    if (totalDone === 0) {
      setToast("先记一组再结束");
      return;
    }
    setFinishing(true);
    const result = await finishWorkoutAction(sessionId);
    if (!result.ok) {
      setFinishing(false);
      setToast(result.message);
      return;
    }
    router.push(`/workout/${sessionId}/done`);
  }

  return (
    <div className="min-h-screen bg-canvas pb-32">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] text-ink-3">{planName}</p>
            <p className="truncate text-sm font-semibold">{dayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="num text-lg font-bold tracking-tight">{formatClock(elapsed)}</span>
            <a
              href="/plan"
              aria-label="退出训练"
              className="grid size-8 place-items-center rounded-full border border-line text-ink-2"
            >
              <X className="size-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {blocks.map((block, index) => {
          const open = openId === block.id;
          const done = block.sets.length;
          const progress = Math.min(100, Math.round((done / Math.max(block.targetSets, 1)) * 100));

          return (
            <section
              key={block.id}
              className={`mb-3 overflow-hidden rounded-card border bg-surface transition-colors ${
                open ? "border-brand/40" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : block.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    block.status === "SKIPPED"
                      ? "bg-sunken text-ink-3"
                      : done > 0
                        ? "bg-brand text-white"
                        : "bg-sunken text-ink-2"
                  }`}
                >
                  {block.status === "SKIPPED" ? "—" : done > 0 ? <Check className="size-3.5" /> : index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`truncate text-[15px] font-semibold ${block.status === "SKIPPED" ? "text-ink-3 line-through" : ""}`}>
                      {block.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-ink-3">{block.muscle}</span>
                  </span>
                  <span className="num mt-0.5 block text-[11px] text-ink-3">
                    {done}/{block.targetSets} 组 · 目标 {block.repsMin}–{block.repsMax} 次 · 休息 {block.restSec}s
                  </span>
                  {!open && done > 0 ? (
                    <span className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-sunken">
                      <span className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                    </span>
                  ) : null}
                </span>

                <ChevronDown
                  className={`size-4 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open ? (
                <div className="border-t border-line px-4 pt-3 pb-4">
                  {block.last ? (
                    <p className="num mb-2 text-[11px] text-ink-3">
                      上次（{block.last.date.slice(5)}）：
                      {block.last.sets.slice(0, 4).map((s) => `${s.weightKg}×${s.reps}`).join(" / ")}
                    </p>
                  ) : (
                    <p className="mb-2 text-[11px] text-ink-3">第一次练这个动作</p>
                  )}

                  {/* 表头 */}
                  <div className="grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2 pb-1.5 text-[10px] text-ink-3">
                    <span>组</span>
                    <span>重量 kg</span>
                    <span>次数</span>
                    <span />
                  </div>

                  {block.sets.map((set) => (
                    <div key={set.id} className="grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2 py-1">
                      <span className="num text-[12px] text-ink-2">{set.setIndex}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={2.5}
                        defaultValue={set.weightKg}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== set.weightKg) commitSet(block, set, v, set.reps);
                        }}
                        className="num h-10 w-full rounded-lg border border-line bg-sunken px-2.5 text-sm outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        defaultValue={set.reps}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== set.reps) commitSet(block, set, set.weightKg, v);
                        }}
                        className="num h-10 w-full rounded-lg border border-line bg-sunken px-2.5 text-sm outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeSet(block, set.id)}
                        aria-label="删除这一组"
                        className="grid size-8 place-items-center rounded-full text-ink-3 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* 待记录的一组 */}
                  <div className="mt-1 grid grid-cols-[28px_1fr_1fr_36px] items-center gap-2 py-1">
                    <span className="num text-[12px] font-medium text-brand">{block.sets.length + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={2.5}
                      value={draft[block.id]?.weight ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [block.id]: { weight: e.target.value, reps: p[block.id]?.reps ?? "" },
                        }))
                      }
                      placeholder={`${placement(block).w || "0"}`}
                      className="num h-11 w-full rounded-lg border border-brand/40 bg-surface px-2.5 text-sm font-semibold outline-none focus:border-brand"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draft[block.id]?.reps ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [block.id]: { weight: p[block.id]?.weight ?? "", reps: e.target.value },
                        }))
                      }
                      placeholder={`${placement(block).r || ""}`}
                      className="num h-11 w-full rounded-lg border border-brand/40 bg-surface px-2.5 text-sm font-semibold outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => submitSet(block)}
                      aria-label="完成这一组"
                      className="grid size-8 place-items-center rounded-full bg-brand text-white transition-transform active:scale-95"
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => skip(block)}
                      className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-2"
                    >
                      <SkipForward className="size-3" />
                      {block.status === "SKIPPED" ? "恢复这个动作" : "跳过"}
                    </button>
                    <a
                      href={`/exercises`}
                      className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-2"
                    >
                      看动作要领
                    </a>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </main>

      {/* 底部完成条 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="num text-[12px] text-ink-2">
              已记 {totalDone} 组 · {Math.round(totalVolume).toLocaleString()} kg
            </p>
            <p className="text-[10px] text-ink-3">完成训练后才会记入统计</p>
          </div>
          <button
            type="button"
            onClick={finish}
            disabled={finishing}
            className="flex h-11 items-center gap-1.5 rounded-btn bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {finishing ? <Loader2 className="size-4 animate-spin" /> : null}
            完成训练
          </button>
        </div>
      </div>

      {/* 组间休息浮层 */}
      {rest ? (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink/85 backdrop-blur-sm">
          <p className="text-[13px] font-medium text-white/70">组间休息</p>
          <div className="relative mt-6 grid size-56 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#C8F169"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - restLeft / Math.max(rest.total, 1))}
                style={{ transition: "stroke-dashoffset 0.25s linear" }}
              />
            </svg>
            <span className="num text-[64px] leading-none font-bold text-white tabular-nums">
              {restLeft}
            </span>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustRest(-15)}
              className="flex h-11 items-center gap-1 rounded-full border border-white/25 px-4 text-sm text-white/80"
            >
              <Minus className="size-3.5" />15s
            </button>
            <button
              type="button"
              onClick={() => setRest(null)}
              className="h-11 rounded-full bg-white/15 px-6 text-sm font-medium text-white"
            >
              跳过休息
            </button>
            <button
              type="button"
              onClick={() => adjustRest(15)}
              className="flex h-11 items-center gap-1 rounded-full border border-white/25 px-4 text-sm text-white/80"
            >
              15s<Plus className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs text-canvas shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
