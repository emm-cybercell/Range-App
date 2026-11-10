"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { calcMetabolic, type Goal } from "@/lib/metabolic";
import { saveOnboarding } from "./actions";

type Sex = "MALE" | "FEMALE";
type Equipment = "GYM" | "DUMBBELL" | "BODYWEIGHT";
type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "MUSCLE_GAIN", label: "增肌", hint: "围度变大" },
  { value: "FAT_LOSS", label: "减脂", hint: "体脂下降" },
  { value: "SHAPING", label: "塑形", hint: "线条好看" },
  { value: "STRENGTH", label: "力量", hint: "重量更大" },
  { value: "MAINTAIN", label: "保持", hint: "维持现状" },
];

const EQUIPMENTS: { value: Equipment; label: string; hint: string }[] = [
  { value: "GYM", label: "健身房", hint: "器械齐全" },
  { value: "DUMBBELL", label: "哑铃 + 徒手", hint: "家里有哑铃" },
  { value: "BODYWEIGHT", label: "纯徒手", hint: "只要一块垫子" },
];

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: "BEGINNER", label: "新手", hint: "不到 6 个月" },
  { value: "INTERMEDIATE", label: "进阶", hint: "6 个月 – 2 年" },
  { value: "ADVANCED", label: "老手", hint: "2 年以上" },
];

const STEPS = ["你的身体数据", "训练目标", "你的方案"];
const num = "num h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none focus:border-brand";

/** 输入框被清空时 valueAsNumber 为 NaN，回落到 fallback，避免 NaN 进入受控值 */
const toNumber = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

function Choice({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-line bg-surface text-ink hover:border-ink-3/40"
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      {hint ? (
        <span className={`mt-0.5 block text-[11px] ${active ? "text-brand/80" : "text-ink-3"}`}>
          {hint}
        </span>
      ) : null}
    </button>
  );
}

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(saveOnboarding, null);
  const [step, setStep] = useState(0);

  const [sex, setSex] = useState<Sex>("MALE");
  const [age, setAge] = useState(26);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(68);
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [goal, setGoal] = useState<Goal>("MUSCLE_GAIN");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [equipment, setEquipment] = useState<Equipment>("GYM");
  const [level, setLevel] = useState<Level>("BEGINNER");

  const derived = useMemo(
    () => calcMetabolic({ sex, age, heightCm, weightKg, goal, daysPerWeek }),
    [sex, age, heightCm, weightKg, goal, daysPerWeek],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
      {/* 进度 */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-ink-2">
          {step + 1} / {STEPS.length}
        </span>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-brand" : "bg-sunken"
              }`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-6 text-[22px] font-bold tracking-tight">{STEPS[step]}</h1>
      <p className="mt-1.5 text-sm text-ink-2">
        {step === 0 && "用来算你的基础代谢和每日建议摄入。"}
        {step === 1 && "决定了练什么、练几天，之后随时能改。"}
        {step === 2 && "这是按你的数据算出来的起点，不是终点。"}
      </p>

      <form action={action} className="mt-7 flex-1">
        {/*
          分步表单的可见输入框只在当前步骤挂载，
          因此在第 3 步点提交时 age/heightCm/weightKg 已不在 DOM 里。
          所有值统一由常驻的隐藏字段提交，保证任何一步提交都是完整表单。
        */}
        <input type="hidden" name="sex" value={sex} />
        <input type="hidden" name="age" value={age} />
        <input type="hidden" name="heightCm" value={heightCm} />
        <input type="hidden" name="weightKg" value={weightKg} />
        <input type="hidden" name="goal" value={goal} />
        <input type="hidden" name="daysPerWeek" value={daysPerWeek} />
        <input type="hidden" name="equipment" value={equipment} />
        <input type="hidden" name="level" value={level} />
        <input type="hidden" name="targetWeightKg" value={targetWeightKg} />

        {step === 0 && (
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-medium text-ink-2">性别</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Choice active={sex === "MALE"} label="男" onClick={() => setSex("MALE")} />
                <Choice active={sex === "FEMALE"} label="女" onClick={() => setSex("FEMALE")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="age" className="text-[13px] font-medium text-ink-2">
                  年龄
                </label>
                <input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={14}
                  max={80}
                  value={age}
                  onChange={(e) => setAge(toNumber(e.target.valueAsNumber, 0))}
                  className={`mt-1.5 ${num}`}
                />
              </div>
              <div>
                <label htmlFor="heightCm" className="text-[13px] font-medium text-ink-2">
                  身高 <span className="text-ink-3">cm</span>
                </label>
                <input
                  id="heightCm"
                  type="number"
                  inputMode="decimal"
                  min={120}
                  max={220}
                  step={0.5}
                  value={heightCm}
                  onChange={(e) => setHeightCm(toNumber(e.target.valueAsNumber, 0))}
                  className={`mt-1.5 ${num}`}
                />
              </div>
              <div>
                <label htmlFor="weightKg" className="text-[13px] font-medium text-ink-2">
                  体重 <span className="text-ink-3">kg</span>
                </label>
                <input
                  id="weightKg"
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={250}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(toNumber(e.target.valueAsNumber, 0))}
                  className={`mt-1.5 ${num}`}
                />
              </div>
              <div>
                <label htmlFor="targetWeight" className="text-[13px] font-medium text-ink-2">
                  目标体重 <span className="text-ink-3">选填</span>
                </label>
                <input
                  id="targetWeight"
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={250}
                  step={0.1}
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  placeholder="—"
                  className={`mt-1.5 ${num}`}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-medium text-ink-2">训练目标</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {GOALS.map((g) => (
                  <Choice
                    key={g.value}
                    active={goal === g.value}
                    label={g.label}
                    hint={g.hint}
                    onClick={() => setGoal(g.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium text-ink-2">每周能练几天</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((d) => (
                  <Choice
                    key={d}
                    active={daysPerWeek === d}
                    label={`${d} 天`}
                    onClick={() => setDaysPerWeek(d)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium text-ink-2">器械条件</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {EQUIPMENTS.map((e) => (
                  <Choice
                    key={e.value}
                    active={equipment === e.value}
                    label={e.label}
                    hint={e.hint}
                    onClick={() => setEquipment(e.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium text-ink-2">训练经验</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {LEVELS.map((l) => (
                  <Choice
                    key={l.value}
                    active={level === l.value}
                    label={l.label}
                    hint={l.hint}
                    onClick={() => setLevel(l.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-xs text-ink-3">基础代谢 BMR</p>
                <p className="num mt-1 text-2xl font-bold">
                  {derived.bmr}
                  <span className="ml-1 text-xs font-medium text-ink-2">kcal</span>
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-xs text-ink-3">每日消耗 TDEE</p>
                <p className="num mt-1 text-2xl font-bold">
                  {derived.tdee}
                  <span className="ml-1 text-xs font-medium text-ink-2">kcal</span>
                </p>
              </div>
            </div>

            <div className="rounded-card border border-brand/30 bg-brand-soft p-4">
              <p className="text-xs font-medium text-brand">每日建议摄入</p>
              <p className="num mt-1 text-[32px] leading-9 font-bold text-brand">
                {derived.targetKcal}
                <span className="ml-1 text-sm font-medium">kcal</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["蛋白", derived.targetProtein, "g"],
                  ["碳水", derived.targetCarbs, "g"],
                  ["脂肪", derived.targetFat, "g"],
                ].map(([label, value, unit]) => (
                  <div key={label as string} className="rounded-lg bg-surface/70 py-2">
                    <p className="text-[11px] text-ink-2">{label}</p>
                    <p className="num text-sm font-semibold">
                      {value}
                      <span className="ml-0.5 text-[10px] font-normal text-ink-3">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
              <span className="text-sm text-ink-2">BMI</span>
              <span className="num text-sm font-semibold">
                {derived.bmi}
                <span className="ml-2 text-xs font-normal text-ink-3">目标 {targetWeightKg || "未设置"}</span>
              </span>
            </div>

            <p className="px-1 text-[12px] leading-5 text-ink-3">
              确认后就能开始记录训练。目标「{GOALS.find((g) => g.value === goal)?.label} · 每周{" "}
              {daysPerWeek} 天 · {EQUIPMENTS.find((e) => e.value === equipment)?.label}
              」，之后随时能改。
            </p>
          </div>
        )}

        {state?.error ? (
          <p className="mt-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
            {state.error}
          </p>
        ) : null}

        {/* 操作区 */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex h-12 items-center justify-center gap-1.5 rounded-btn border border-line bg-surface px-5 text-sm font-medium text-ink-2"
            >
              <ArrowLeft className="size-4" />
              上一步
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-btn bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              下一步
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认，开始使用
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
