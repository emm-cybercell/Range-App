import Link from "next/link";
import { ArrowRight, Flame, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { calcMetabolic, type Goal, type Sex } from "@/lib/metabolic";
import { getTodayPlan, planDayMinutes } from "@/lib/plans";
import { getActiveSessionId } from "@/lib/workouts";
import { startWorkoutAction } from "@/app/workout/actions";
import { WEEKDAY_LABEL } from "@/lib/plan-templates";
import { todayString } from "@/lib/date";
import { ThemeToggle } from "@/components/theme-toggle";

const WEEK_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDateLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${WEEK_SHORT[d.getDay()]}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "还没睡？";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export const instant = false;

export default async function HomePage() {
  const account = await requireAccount();
  if (!account) return null;

  // 日期只在这里取一次，后续全部基于这个字符串推导，避免渲染期重复读时钟
  const dateKey = todayString();
  const dateValue = new Date(`${dateKey}T00:00:00.000Z`);

  // 一次并行发出：这些查询互相没有依赖
  const [profile, todayMetric, latestMetric, quotes, todayPlan, activeSessionId, todayKcal] =
    await Promise.all([
      prisma.profile.findUnique({ where: { accountId: account.id } }),
      prisma.bodyMetric.findUnique({
        where: { accountId_date: { accountId: account.id, date: dateValue } },
      }),
      prisma.bodyMetric.findFirst({
        where: { accountId: account.id },
        orderBy: { date: "desc" },
      }),
      // 标语总量很小，一次取回在内存里按日期取模，省掉 count + skip 两次往返
      prisma.quote.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        take: 200,
        select: { text: true },
      }),
      getTodayPlan(account.id),
      getActiveSessionId(account.id),
      prisma.mealEntry.aggregate({
        where: { accountId: account.id, date: dateValue },
        _sum: { kcal: true },
      }),
    ]);

  const quote =
    quotes.length > 0
      ? quotes[Number(dateKey.replace(/-/g, "")) % quotes.length]
      : null;

  const derived =
    profile?.sex && profile.age && profile.heightCm && profile.weightKg && profile.goal && profile.daysPerWeek
      ? calcMetabolic({
          sex: profile.sex as Sex,
          age: profile.age,
          heightCm: Number(profile.heightCm),
          weightKg: Number(profile.weightKg),
          goal: profile.goal as Goal,
          daysPerWeek: profile.daysPerWeek,
        })
      : null;

  const weightNow = latestMetric ? Number(latestMetric.weightKg) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[13px] text-ink-3">{formatDateLabel(dateKey)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {greeting()}，{account.nickname}
          </h1>
        </div>
        <ThemeToggle />
      </header>

      {/* 每日一句 */}
      {quote ? (
        <div className="mt-5 rounded-card border border-line bg-surface p-5">
          <p className="text-[15px] leading-6 font-medium">「{quote.text}」</p>
        </div>
      ) : null}

      {/* 今日训练 */}
      <section className="mt-4 rounded-card border border-line bg-surface p-5">
        {todayPlan.plan ? (
          todayPlan.day ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-3">今天 · {todayPlan.plan.name}</p>
                  <p className="mt-1 text-[17px] font-semibold">{todayPlan.day.name}</p>
                </div>
                <span className="num shrink-0 text-right text-[11px] text-ink-3">
                  {todayPlan.day.exercises.length} 个动作
                  <br />
                  约 {planDayMinutes(todayPlan.day)} 分钟
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {todayPlan.day.exercises.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5 text-sm">
                    <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="min-w-0 flex-1 truncate">{item.exercise.name}</span>
                    <span className="num shrink-0 text-[12px] text-ink-2">
                      {item.targetSets} × {item.repsMin}–{item.repsMax}
                    </span>
                  </li>
                ))}
                {todayPlan.day.exercises.length > 4 ? (
                  <li className="pl-4 text-[12px] text-ink-3">
                    还有 {todayPlan.day.exercises.length - 4} 个动作
                  </li>
                ) : null}
              </ul>

              {activeSessionId ? (
                <Link
                  href={`/workout/${activeSessionId}`}
                  className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-btn bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  继续未完成的训练
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <form action={startWorkoutAction} className="mt-4">
                  <input type="hidden" name="planDayId" value={todayPlan.day.id} />
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    开始训练
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-ink-3">今天 · {todayPlan.plan.name}</p>
              <p className="mt-1 text-[17px] font-semibold">今天休息</p>
              <p className="mt-2 text-sm leading-6 text-ink-2">
                {todayPlan.upcoming
                  ? `下一次是${WEEKDAY_LABEL[todayPlan.upcoming.day.weekday ?? 1]}的${todayPlan.upcoming.day.name}。`
                  : "恢复也是训练的一部分。"}
              </p>
              <Link
                href="/plan"
                className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-btn border border-line text-sm font-medium text-ink transition-colors hover:border-ink-3/40"
              >
                看完整计划
              </Link>
            </>
          )
        ) : (
          <>
            <p className="text-xs text-ink-3">今天练什么</p>
            <p className="mt-1 text-[17px] font-semibold">还没有训练计划</p>
            <p className="mt-2 text-sm leading-6 text-ink-2">
              按你每周 {profile?.daysPerWeek ?? 4} 天的节奏，挑一套现成的就能开始。
            </p>
            <Link
              href="/plan/templates"
              className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-btn bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              选一套计划
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </section>

      {/* 数据概览 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/me/body" className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <TrendingUp className="size-3.5" />
            当前体重
          </div>
          <p className="num mt-1.5 text-[28px] leading-9 font-bold">
            {weightNow ?? "—"}
            <span className="ml-1 text-sm font-medium text-ink-2">kg</span>
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {todayMetric ? "今天已记录" : "今天还没称重"}
            {profile?.targetWeightKg ? ` · 目标 ${Number(profile.targetWeightKg)} kg` : ""}
          </p>
        </Link>

        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <Flame className="size-3.5" />
            每日建议摄入
          </div>
          <p className="num mt-1.5 text-[28px] leading-9 font-bold text-brand">
            {derived?.targetKcal ?? "—"}
            <span className="ml-1 text-sm font-medium">kcal</span>
          </p>
          <p className="mt-1 text-xs text-ink-3">
            蛋白 {derived?.targetProtein ?? "—"} g · 碳水 {derived?.targetCarbs ?? "—"} g · 脂肪{" "}
            {derived?.targetFat ?? "—"} g
          </p>
        </div>
      </div>
      <Link
        href="/nutrition"
        className="mt-3 flex items-center justify-between rounded-card border border-line bg-surface px-5 py-3.5"
      >
        <span className="text-sm font-medium">今天的饮食</span>
        <span className="num text-[13px] text-ink-2">
          已摄入 {todayKcal._sum.kcal ?? 0} / {derived?.targetKcal ?? "—"} kcal
        </span>
      </Link>

      <Link
        href="/stats"
        className="mt-3 flex items-center justify-between rounded-card border border-line bg-surface px-5 py-3.5"
      >
        <span className="text-sm font-medium">训练数据</span>
        <span className="text-[13px] text-ink-2">容量 · 部位分布 · 连续打卡 →</span>
      </Link>
    </div>
  );
}
