"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  duplicatePlan,
  savePlan,
  searchExercises,
  type ExerciseHit,
} from "../../editor-actions";

export type EditorExercise = {
  id: string | null;
  exerciseId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  muscle: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
};

export type EditorDay = {
  id: string | null;
  name: string;
  weekday: number | null;
  exercises: EditorExercise[];
};

const WEEKDAYS = ["未排期", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const BODY_PART: Record<string, string> = {
  CHEST: "胸",
  BACK: "背",
  SHOULDERS: "肩",
  ARMS: "手臂",
  LEGS: "腿",
  CORE: "核心",
};
const inputClass =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand";

function num(value: string, fallback: number) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

export function PlanEditor({
  planId,
  planName,
  updatedAt,
  initialDays,
}: {
  planId: string;
  planName: string;
  updatedAt: string;
  initialDays: EditorDay[];
}) {
  const router = useRouter();
  const [name, setName] = useState(planName);
  const [days, setDays] = useState<EditorDay[]>(initialDays);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [searchAt, setSearchAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ExerciseHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  const totalExercises = useMemo(
    () => days.reduce((sum, day) => sum + day.exercises.length, 0),
    [days],
  );

  const touch = (next: EditorDay[]) => {
    setDays(next);
    setDirty(true);
    setMessage(null);
  };

  const updateDay = (index: number, patch: Partial<EditorDay>) => {
    touch(days.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const moveDay = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    touch(next);
  };

  const addDay = () => {
    if (days.length >= 7) {
      setMessage({ type: "err", text: "最多 7 个训练日" });
      return;
    }
    const used = new Set(days.map((d) => d.weekday).filter((w): w is number => typeof w === "number"));
    const free = [1, 2, 3, 4, 5, 6, 7].find((w) => !used.has(w)) ?? null;
    touch([
      ...days,
      { id: null, name: `训练日 ${days.length + 1}`, weekday: free, exercises: [] },
    ]);
  };

  const removeDay = (index: number) => {
    if (days.length <= 1) {
      setMessage({ type: "err", text: "至少保留一个训练日" });
      return;
    }
    touch(days.filter((_, i) => i !== index));
  };

  const copyDay = (index: number) => {
    if (days.length >= 7) {
      setMessage({ type: "err", text: "最多 7 个训练日" });
      return;
    }
    const source = days[index];
    const clone: EditorDay = {
      id: null,
      name: `${source.name} 副本`.slice(0, 20),
      weekday: null,
      exercises: source.exercises.map((item) => ({ ...item, id: null })),
    };
    touch([...days.slice(0, index + 1), clone, ...days.slice(index + 1)]);
  };

  const updateExercise = (dayIndex: number, exIndex: number, patch: Partial<EditorExercise>) => {
    const next = days.map((day, i) =>
      i === dayIndex
        ? {
            ...day,
            exercises: day.exercises.map((item, j) => (j === exIndex ? { ...item, ...patch } : item)),
          }
        : day,
    );
    touch(next);
  };

  const moveExercise = (dayIndex: number, exIndex: number, delta: number) => {
    const day = days[dayIndex];
    const target = exIndex + delta;
    if (target < 0 || target >= day.exercises.length) return;
    const items = [...day.exercises];
    [items[exIndex], items[target]] = [items[target], items[exIndex]];
    const next = days.map((d, i) => (i === dayIndex ? { ...d, exercises: items } : d));
    touch(next);
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    const next = days.map((d, i) =>
      i === dayIndex ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) } : d,
    );
    touch(next);
  };

  const runSearch = async (value: string) => {
    setQuery(value);
    setSearching(true);
    try {
      setHits(await searchExercises(value));
    } finally {
      setSearching(false);
    }
  };

  const addExercise = (hit: ExerciseHit) => {
    if (searchAt === null) return;
    const day = days[searchAt];
    if (day.exercises.some((e) => e.exerciseId === hit.id)) {
      setMessage({ type: "err", text: "这个动作已经在这一天了" });
      return;
    }
    if (day.exercises.length >= 15) {
      setMessage({ type: "err", text: "每天最多 15 个动作" });
      return;
    }
    const next = days.map((d, i) =>
      i === searchAt
        ? {
            ...d,
            exercises: [
              ...d.exercises,
              {
                id: null,
                exerciseId: hit.id,
                name: hit.name,
                bodyPart: hit.bodyPart,
                equipment: hit.equipment,
                muscle: hit.muscle,
                targetSets: 3,
                repsMin: 8,
                repsMax: 12,
                restSec: 90,
              },
            ],
          }
        : d,
    );
    touch(next);
  };

  const save = () => {
    startTransition(async () => {
      const result = await savePlan({
        id: planId,
        name,
        updatedAt,
        days: days.map((day) => ({
          id: day.id,
          name: day.name,
          weekday: day.weekday,
          exercises: day.exercises.map((item) => ({
            id: item.id,
            exerciseId: item.exerciseId,
            targetSets: item.targetSets,
            repsMin: item.repsMin,
            repsMax: item.repsMax,
            restSec: item.restSec,
          })),
        })),
      });
      if (result.ok) {
        setDirty(false);
        setMessage({ type: "ok", text: "已保存" });
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.message });
      }
    });
  };

  const duplicate = () => {
    startTransition(async () => {
      const result = await duplicatePlan(planId);
      if (result.ok && result.planId) router.push(`/plan/${result.planId}/edit`);
      else if (!result.ok) setMessage({ type: "err", text: result.message });
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-8">
      <PageHeader
        title="编辑计划"
        subtitle={`${days.length} 个训练日 · ${totalExercises} 个动作`}
        back={{ href: "/plan", label: "我的计划" }}
        actions={
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            保存
          </button>
        }
      />

      <div className="mt-5">
        <label className="text-[13px] font-medium text-ink-2" htmlFor="plan-name">
          计划名称
        </label>
        <input
          id="plan-name"
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          className={`mt-1.5 ${inputClass}`}
        />
      </div>

      {message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${
            message.type === "ok" ? "bg-brand-soft text-brand" : "bg-warn/10 text-warn"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {days.map((day, dayIndex) => (
          <section key={day.id ?? `new-${dayIndex}`} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <input
                value={day.name}
                maxLength={20}
                onChange={(e) => updateDay(dayIndex, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-brand"
              />
              <select
                value={day.weekday ?? 0}
                onChange={(e) => updateDay(dayIndex, { weekday: Number(e.target.value) || null })}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-brand"
              >
                {WEEKDAYS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="上移训练日"
                  onClick={() => moveDay(dayIndex, -1)}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="下移训练日"
                  onClick={() => moveDay(dayIndex, 1)}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="复制训练日"
                  onClick={() => copyDay(dayIndex)}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="删除训练日"
                  onClick={() => removeDay(dayIndex)}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-warn/10 hover:text-warn"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {day.exercises.map((item, exIndex) => (
                <div key={item.id ?? `${item.exerciseId}-${exIndex}`} className="rounded-xl bg-sunken p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="num w-4 shrink-0 text-[11px] text-ink-3">{exIndex + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] text-ink-2">
                      {BODY_PART[item.bodyPart] ?? item.bodyPart}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="上移动作"
                        onClick={() => moveExercise(dayIndex, exIndex, -1)}
                        className="grid size-7 place-items-center rounded text-ink-3 hover:bg-surface hover:text-ink"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="下移动作"
                        onClick={() => moveExercise(dayIndex, exIndex, 1)}
                        className="grid size-7 place-items-center rounded text-ink-3 hover:bg-surface hover:text-ink"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="删除动作"
                        onClick={() => removeExercise(dayIndex, exIndex)}
                        className="grid size-7 place-items-center rounded text-ink-3 hover:bg-warn/10 hover:text-warn"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { label: "组数", key: "targetSets" as const, min: 1, max: 10 },
                      { label: "最少次", key: "repsMin" as const, min: 1, max: 100 },
                      { label: "最多次", key: "repsMax" as const, min: 1, max: 100 },
                      { label: "休息秒", key: "restSec" as const, min: 0, max: 600 },
                    ].map((field) => (
                      <label key={field.key} className="block">
                        <span className="text-[10px] text-ink-3">{field.label}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={field.min}
                          max={field.max}
                          value={item[field.key]}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, {
                              [field.key]: num(e.target.value, item[field.key]),
                            } as Partial<EditorExercise>)
                          }
                          className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1 text-center text-[13px] outline-none focus:border-brand"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchAt(dayIndex);
                setQuery("");
                setHits([]);
                void runSearch("");
              }}
              className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-btn border border-dashed border-line px-3 text-[13px] font-medium text-ink-2 hover:border-brand/50 hover:text-brand"
            >
              <Plus className="size-3.5" />
              添加动作
            </button>

            {searchAt === dayIndex ? (
              <div className="mt-2.5 rounded-xl border border-line p-2.5">
                <div className="flex items-center gap-2">
                  <Search className="size-4 shrink-0 text-ink-3" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => void runSearch(e.target.value)}
                    placeholder="搜动作名、拼音或首字母"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <button
                    type="button"
                    aria-label="关闭搜索"
                    onClick={() => setSearchAt(null)}
                    className="grid size-7 place-items-center rounded text-ink-3 hover:bg-sunken"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  {searching ? (
                    <p className="px-1 py-2 text-[13px] text-ink-3">搜索中…</p>
                  ) : hits.length === 0 ? (
                    <p className="px-1 py-2 text-[13px] text-ink-3">没有匹配的动作</p>
                  ) : (
                    hits.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        onClick={() => addExercise(hit)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-sunken"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{hit.name}</span>
                        <span className="shrink-0 text-[11px] text-ink-3">{hit.muscle}</span>
                        <Plus className="size-3.5 shrink-0 text-brand" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line text-sm font-medium text-ink-2 hover:border-brand/50 hover:text-brand"
      >
        <Plus className="size-4" />
        添加训练日
      </button>

      <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
        <div>
          <p className="text-[13px] font-medium">复制这份计划</p>
          <p className="mt-0.5 text-[11px] text-ink-3">保留现有内容，另存一份再改</p>
        </div>
        <button
          type="button"
          onClick={duplicate}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-btn border border-line px-3 text-[13px] font-medium text-ink-2 hover:text-ink disabled:opacity-40"
        >
          <Copy className="size-3.5" />
          复制
        </button>
      </div>

      <div className="mt-3 text-center">
        <Link href="/plan" className="text-[13px] text-ink-3 hover:text-ink-2">
          返回我的计划
        </Link>
      </div>

      {dirty ? (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 md:bottom-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-2.5 shadow-[0_8px_30px_rgba(20,35,28,0.12)]">
            <span className="text-[13px] text-ink-2">有未保存的修改</span>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-brand px-3.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              保存
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
