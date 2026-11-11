"use client";

import { useState } from "react";
import { Check, ChevronLeft, Clock3, Dumbbell, RotateCw } from "lucide-react";
import { createPlanAction } from "../actions";
import { SubmitButton } from "@/components/submit-button";

type Day = { name: string; exercises: { slug: string; sets: number }[] };

export function TemplateCard({
  slug,
  name,
  subtitle,
  description,
  days,
  totalExercises,
  avgMinutes,
  recommended,
  compatible,
  reason,
}: {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  days: Day[];
  totalExercises: number;
  avgMinutes: number;
  recommended: boolean;
  compatible: boolean;
  reason: string;
}) {
  const [flipped, setFlipped] = useState(false);

  const minutes = (day: Day) =>
    Math.max(15, Math.round(day.exercises.reduce((sum, e) => sum + e.sets * 2.2 + 4, 0)));

  return (
    <div className="[perspective:1000px]">
      <div
        className="relative transition-transform duration-[420ms] ease-[var(--ease-out-soft)]"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* 正面 */}
        <div
          className={`rounded-card border bg-surface p-5 [backface-visibility:hidden] [transform:translateZ(0)] ${
            recommended ? "border-brand/40" : "border-line"
          }`}
          aria-hidden={flipped}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{name}</h2>
                {recommended ? (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                    推荐
                  </span>
                ) : null}
                {!compatible ? (
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-3">
                    {reason}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] text-ink-3">{subtitle}</p>
            </div>

            <span className="shrink-0 text-right">
              <span className="num block text-lg font-bold">{days.length}</span>
              <span className="block text-[10px] text-ink-3">训练日</span>
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-ink-2">{description}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="size-3" />
              {totalExercises} 个动作
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              每次约 {avgMinutes} 分钟
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="size-3" />
              {days.map((d) => d.name).join(" / ")}
            </span>
          </div>

          <form action={createPlanAction} className="mt-4">
            <input type="hidden" name="templateSlug" value={slug} />
            <SubmitButton
              pendingText="正在生成计划…"
              className={`h-11 w-full rounded-btn text-sm font-semibold transition-colors ${
                recommended
                  ? "bg-brand text-white hover:bg-brand-hover"
                  : "border border-line bg-surface text-ink hover:border-ink-3/40"
              }`}
            >
              用这套计划
            </SubmitButton>
          </form>

          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-expanded={flipped}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[11px] text-ink-3 hover:text-ink-2"
          >
            <RotateCw className="size-3" />
            看看训练日怎么排
          </button>
        </div>

        {/* 背面：沿 Y 轴翻过来，绝对定位盖住正面 */}
        <div
          className="absolute inset-0 overflow-y-auto rounded-card border border-line bg-surface p-4 [scrollbar-width:none] [backface-visibility:hidden] [transform:rotateY(180deg)] [&::-webkit-scrollbar]:hidden"
          aria-hidden={!flipped}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{name} · 训练日</h3>
            <button
              type="button"
              onClick={() => setFlipped(false)}
              aria-expanded={!flipped}
              className="inline-flex items-center gap-0.5 text-[11px] text-ink-3 hover:text-ink-2"
            >
              <ChevronLeft className="size-3" />
              返回
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {days.map((day) => (
              <li key={day.name} className="rounded-xl bg-sunken px-2.5 py-1.5">
                <p className="text-[13px] font-medium">{day.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {day.exercises.length} 个动作 · 约 {minutes(day)} 分钟
                </p>
              </li>
            ))}
          </ul>

          <form action={createPlanAction} className="mt-3">
            <input type="hidden" name="templateSlug" value={slug} />
            <SubmitButton
              pendingText="正在生成计划…"
              className="h-10 w-full rounded-btn bg-brand text-[13px] font-semibold text-white"
            >
              用这套计划
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
