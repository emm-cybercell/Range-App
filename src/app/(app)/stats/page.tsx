import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Flame, Timer, Weight } from "lucide-react";
import { prisma } from "@/lib/db";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { requireAccount } from "@/lib/account";
import { getStats } from "@/lib/stats";

const BODY_PART_LABEL: Record<string, string> = {
  CHEST: "胸",
  BACK: "背",
  SHOULDERS: "肩",
  ARMS: "手臂",
  LEGS: "腿",
  CORE: "核心",
};

const LEVEL_CLASS = ["bg-sunken", "bg-brand/25", "bg-brand/50", "bg-brand"];

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function StatsPage() {
  const account = await requireAccount();
  if (!account) return null;

  const profile = await prisma.profile.findUnique({
    where: { accountId: account.id },
    select: { daysPerWeek: true },
  });

  // 本周目标用档案里的每周训练天数
  const target = profile?.daysPerWeek ?? 0;

  const [summary, history] = await Promise.all([
    getStats(account.id, target),
    prisma.workoutSession.findMany({
      where: { accountId: account.id, status: "COMPLETED" },
      orderBy: { date: "desc" },
      take: 12,
      select: {
        id: true,
        date: true,
        dayNameSnapshot: true,
        durationSec: true,
        totalVolumeKg: true,
        totalSets: true,
      },
    }),
  ]);

  const maxWeekly = Math.max(1, ...summary.weeklyVolume.map((w) => w.volumeKg));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <PageHeader
        title="数据"
        subtitle={`累计 ${summary.totalWorkouts} 次训练`}
        back={{ href: "/me", label: "我的" }}
      />

      {/* 本周三项 */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-card border border-line bg-surface p-3.5">
          <Timer className="size-3.5 text-ink-3" />
          <p className="num mt-2 text-[22px] leading-7 font-bold">
            <AnimatedNumber value={summary.week.count} />
            <span className="text-xs font-medium text-ink-3">/{target || "—"}</span>
          </p>
          <p className="text-[11px] text-ink-3">本周训练</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <Flame className="size-3.5 text-ink-3" />
          <p className="num mt-2 text-[22px] leading-7 font-bold">
            <AnimatedNumber value={summary.streakDays} />
          </p>
          <p className="text-[11px] text-ink-3">连续打卡</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3.5">
          <Weight className="size-3.5 text-ink-3" />
          <p className="num mt-2 text-[22px] leading-7 font-bold">
            <AnimatedNumber value={Math.round(summary.week.volumeKg)} />
          </p>
          <p className="text-[11px] text-ink-3">本周容量 kg</p>
        </div>
      </div>

      {summary.totalWorkouts === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center">
          <p className="text-base font-semibold">完成第一次训练，这里会出现你的数据</p>
          <p className="mt-1.5 text-sm text-ink-2">容量、部位分布、连续天数都会自动累积。</p>
          <Link
            href="/plan"
            className="mt-5 inline-flex h-11 items-center rounded-btn bg-brand px-5 text-sm font-semibold text-white"
          >
            去看计划
          </Link>
        </div>
      ) : (
        <>
          {/* 部位分布 */}
          <section className="mt-4 rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold">部位分布</h2>
            <p className="mt-0.5 text-[11px] text-ink-3">按组数统计，排除热身组</p>
            <div className="mt-3 space-y-2.5">
              {summary.bodyParts.map((part) => (
                <div key={part.bodyPart} className="flex items-center gap-3">
                  <span className="w-9 shrink-0 text-[12px] text-ink-2">
                    {BODY_PART_LABEL[part.bodyPart]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${part.percent}%` }} />
                  </div>
                  <span className="num w-10 shrink-0 text-right text-[11px] text-ink-3">
                    {part.percent}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 周容量 */}
          <section className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">近 8 周容量</h2>
              <span className="num text-[11px] text-ink-3">kg</span>
            </div>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {summary.weeklyVolume.map((w) => (
                <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div
                    className={`w-full rounded-t-md ${w.isCurrent ? "bg-brand" : "bg-brand/35"}`}
                    style={{ height: `${Math.max(3, Math.round((w.volumeKg / maxWeekly) * 88))}px` }}
                    title={`${w.label} · ${w.volumeKg} kg`}
                  />
                  <span className="num text-[9px] text-ink-3">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 热力图 */}
          <section className="mt-3 rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold">近 12 周</h2>
            <div className="mt-3 grid h-28 grid-flow-col grid-rows-7 gap-1">
              {summary.heatmap.map((cell) => (
                <span
                  key={cell.date}
                  className={`h-full w-full rounded-[3px] ${LEVEL_CLASS[cell.level]}`}
                  title={`${cell.date} · ${cell.volumeKg} kg`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-ink-3">
              <span>少</span>
              {LEVEL_CLASS.map((cls) => (
                <span key={cls} className={`size-2 rounded-[2px] ${cls}`} />
              ))}
              <span>多</span>
            </div>
          </section>

          {/* 历史 */}
          <section className="mt-3 rounded-card border border-line bg-surface">
            <h2 className="px-5 pt-4 text-sm font-semibold">训练记录</h2>
            <ul className="mt-2 mb-2 divide-y divide-line px-5">
              {history.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="num w-11 shrink-0 text-[11px] text-ink-3">
                    {s.date.toISOString().slice(5, 10)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{s.dayNameSnapshot ?? "训练"}</span>
                  <span className="num shrink-0 text-[11px] text-ink-3">
                    {Math.round((s.durationSec ?? 0) / 60)} 分 · {s.totalSets ?? 0} 组
                  </span>
                  <span className="num w-16 shrink-0 text-right text-[13px] font-medium">
                    {Math.round(Number(s.totalVolumeKg ?? 0)).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
