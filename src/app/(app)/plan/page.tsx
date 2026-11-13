import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Repeat } from "lucide-react";
import { requireAccount } from "@/lib/account";
import { prisma } from "@/lib/db";
import { getActivePlan, isoWeekday, planDayMinutes } from "@/lib/plans";
import { WEEKDAY_LABEL } from "@/lib/plan-templates";
import { startWorkoutAction } from "@/app/workout/actions";
import { SubmitButton } from "@/components/submit-button";
import { activatePlanAction } from "./actions";

const BODY_PART_LABEL: Record<string, string> = {
  CHEST: "胸",
  BACK: "背",
  SHOULDERS: "肩",
  ARMS: "手臂",
  LEGS: "腿",
  CORE: "核心",
};

// 页面外壳保持静态可预取，数据部分放进 Suspense，点击后立刻有骨架
export default function PlanPage() {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <PlanBody />
    </Suspense>
  );
}

function PlanSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-7 w-32 skeleton rounded" />
          <div className="mt-2 h-4 w-48 skeleton rounded" />
        </div>
        <div className="h-9 w-16 skeleton rounded-btn" />
      </div>
      <div className="mt-5 h-12 skeleton rounded-xl" />
      <div className="mt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 skeleton rounded-card" />
        ))}
      </div>
    </div>
  );
}

async function PlanBody() {
  const account = await requireAccount();
  if (!account) return null;

  const [plan, plans] = await Promise.all([
    getActivePlan(account.id),
    prisma.plan.findMany({
      where: { accountId: account.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  const today = isoWeekday();

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight">我的计划</h1>
        <div className="mt-8 rounded-card border border-line bg-surface p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <CalendarDays className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-base font-semibold">还没有计划</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-ink-2">
            选一套现成的，或者按你的时间和器械重新挑。
          </p>
          <Link
            href="/plan/templates"
            className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-btn bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            选一套计划
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const todayDay = plan.days.find((d) => d.weekday === today);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            每周 {plan.days.length} 练 · {plan.days.reduce((n, d) => n + d.exercises.length, 0)} 个动作
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/plan/${plan.id}/edit`}
            className="rounded-btn bg-brand px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            编辑
          </Link>
          <Link
            href="/plan/templates"
            className="rounded-btn border border-line px-3 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            更换
          </Link>
        </div>
      </header>

      {plans.length > 1 ? (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {plans.map((item) => (
            <form key={item.id} action={activatePlanAction} className="shrink-0">
              <input type="hidden" name="planId" value={item.id} />
              <button
                type="submit"
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  item.isActive
                    ? "bg-brand-soft text-brand"
                    : "border border-line text-ink-2 hover:text-ink"
                }`}
              >
                {item.name}
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {/* 本周排期 */}
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const hasTraining = plan.days.some((x) => x.weekday === d);
            const isToday = d === today;
            return (
              <div
                key={d}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 ${
                  isToday ? "bg-brand-soft" : ""
                }`}
              >
                <span className={`text-[11px] ${isToday ? "font-semibold text-brand" : "text-ink-3"}`}>
                  {WEEKDAY_LABEL[d].replace("周", "")}
                </span>
                <span
                  className={`size-1.5 rounded-full ${
                    hasTraining ? (isToday ? "bg-brand" : "bg-ink-3") : "bg-transparent"
                  }`}
                />
              </div>
            );
          })}
        </div>
        <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-2">
          {todayDay
            ? `今天练 ${todayDay.name}，${todayDay.exercises.length} 个动作。`
            : "今天休息，恢复也是训练的一部分。"}
        </p>
      </section>

      {/* 训练日 */}
      <div className="mt-4 space-y-3">
        {plan.days.map((day) => {
          const isToday = day.weekday === today;
          return (
            <section
              key={day.id}
              className={`rounded-card border bg-surface p-5 ${
                isToday ? "border-brand/50" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{day.name}</h2>
                  {isToday ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                      今天
                    </span>
                  ) : null}
                </div>
                <span className="text-[12px] text-ink-3">
                  {day.weekday ? WEEKDAY_LABEL[day.weekday] : "未排期"} · 约{" "}
                  {planDayMinutes(day)} 分钟
                </span>
              </div>

              <ul className="mt-3 divide-y divide-line">
                {day.exercises.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-[10px] font-semibold text-ink-2">
                      {item.order}
                    </span>
                    <Link
                      href={`/exercises/${item.exercise.slug}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand"
                    >
                      {item.exercise.name}
                    </Link>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                      {BODY_PART_LABEL[item.exercise.bodyPart]}
                    </span>
                    <span className="num shrink-0 text-[12px] text-ink-2">
                      {item.targetSets} × {item.repsMin}–{item.repsMax}
                    </span>
                  </li>
                ))}
              </ul>

              {isToday ? (
                <form action={startWorkoutAction} className="mt-4">
                  <input type="hidden" name="planDayId" value={day.id} />
                  <SubmitButton
                    pendingText="正在开始…"
                    className="h-11 w-full rounded-btn bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    开始训练
                  </SubmitButton>
                </form>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
        <Repeat className="size-3" />
        同一套计划循环练 4–8 周再考虑更换
      </p>
    </div>
  );
}
