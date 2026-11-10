import Link from "next/link";
import { ArrowRight, CalendarDays, Lock } from "lucide-react";
import { peekAccount } from "@/lib/account";
import { prisma } from "@/lib/db";
import { getTodayPlan } from "@/lib/plans";
import { parseDate, todayString } from "@/lib/date";

/** 周一到今天的起点（UTC 零点，与库里的 date 对齐） */
function mondayOf(todayKey: string) {
  const d = new Date(`${todayKey}T00:00:00`);
  const weekday = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (weekday - 1));
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return parseDate(`${y}-${m}-${day}`);
}

type Row = { name: string; target: string; done?: boolean };

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-[0_8px_40px_rgba(20,35,28,0.06)]">
      {children}
    </div>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-4 space-y-2.5">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-3 rounded-xl bg-sunken px-3 py-2.5">
          <span
            className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
              row.done ? "bg-brand text-white" : "border-[1.5px] border-line text-transparent"
            }`}
          >
            ✓
          </span>
          <span className="flex-1 truncate text-sm font-medium">{row.name}</span>
          <span className="num shrink-0 text-xs text-ink-2">{row.target}</span>
        </div>
      ))}
    </div>
  );
}

/** 未登录 / 游客：内容打码 + 锁，不展示任何假数据 */
function LockedCard() {
  const placeholder: Row[] = [
    { name: "今日训练动作一", target: "4 × 6–10" },
    { name: "今日训练动作二", target: "4 × 6–10" },
    { name: "今日训练动作三", target: "3 × 8–12" },
    { name: "今日训练动作四", target: "3 × 10–12" },
  ];

  return (
    <div className="relative">
      <div className="select-none blur-[7px]" aria-hidden>
        <CardShell>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-ink-3">今天</p>
              <p className="mt-1 text-lg font-semibold">训练日</p>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-[#14231C]">
              第 1 练
            </span>
          </div>
          <RowList rows={placeholder} />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-3 py-3">
            <span className="text-xs text-ink-2">组间休息</span>
            <span className="num text-2xl font-bold tracking-tight text-brand">01:30</span>
          </div>
        </CardShell>
        <div className="mt-3 inline-flex flex-col rounded-2xl border border-line bg-surface px-4 py-2.5">
          <span className="text-[11px] text-ink-3">本周容量</span>
          <span className="num text-lg leading-6 font-bold">0 kg</span>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-2xl border border-line bg-canvas/85 px-6 py-5 text-center backdrop-blur-sm">
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
            <Lock className="size-4" />
          </span>
          <p className="mt-3 text-sm font-semibold">登录后查看你的今日训练</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-2">
            游客数据会在注册后自动同步过来
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-btn bg-brand px-3.5 text-[13px] font-semibold text-white"
            >
              免费注册
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-btn border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2"
            >
              登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Suspense 兜底：与锁定态一致，避免已登录用户看到「未登录」的措辞 */
export function TodayCardFallback() {
  return (
    <div className="animate-pulse">
      <CardShell>
        <div className="h-4 w-16 rounded bg-sunken" />
        <div className="mt-2 h-6 w-24 rounded bg-sunken" />
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-sunken" />
          ))}
        </div>
      </CardShell>
    </div>
  );
}

/** 动态洞：只有这里读 cookie 与数据库，落地页其余部分仍是静态 */
export async function TodayTrainingCard() {
  const account = await peekAccount();
  if (!account || account.type !== "USER") return <LockedCard />;

  const todayKey = todayString();
  const [todayPlan, week] = await Promise.all([
    getTodayPlan(account.id),
    prisma.workoutSession.aggregate({
      where: {
        accountId: account.id,
        status: "COMPLETED",
        date: { gte: mondayOf(todayKey) },
      },
      _sum: { totalVolumeKg: true },
      _count: true,
    }),
  ]);

  const volume = Math.round(Number(week._sum.totalVolumeKg ?? 0));

  const weekChip = (
    <div className="mt-3 inline-flex flex-col rounded-2xl border border-line bg-surface px-4 py-2.5">
      <span className="text-[11px] text-ink-3">本周容量</span>
      <span className="num text-lg leading-6 font-bold">
        {volume.toLocaleString()}
        <span className="ml-1 text-xs font-medium text-ink-2">kg</span>
      </span>
    </div>
  );

  // 还没有计划
  if (!todayPlan.plan) {
    return (
      <div>
        <CardShell>
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <CalendarDays className="size-3.5" />
            今日训练
          </div>
          <p className="mt-2 text-base font-semibold">还没有安排计划</p>
          <p className="mt-1 text-[12px] leading-5 text-ink-2">
            选一套现成模板，或者自己排一份。
          </p>
          <Link
            href="/plan/templates"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white"
          >
            选一套计划
            <ArrowRight className="size-3.5" />
          </Link>
        </CardShell>
        {weekChip}
      </div>
    );
  }

  const { plan, day, isTrainingDay, upcoming } = todayPlan;

  const rows: Row[] = isTrainingDay && day
    ? day.exercises.slice(0, 4).map((item) => ({
        name: item.exercise.name,
        target: `${item.targetSets} × ${item.repsMin}–${item.repsMax}`,
      }))
    : [];

  return (
    <div>
      <CardShell>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-ink-3">{plan.name}</p>
            <p className="mt-1 truncate text-lg font-semibold">
              {isTrainingDay && day ? day.name : upcoming ? upcoming.day.name : "今天休息"}
            </p>
          </div>
          <span className="ml-2 shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-[#14231C]">
            {isTrainingDay ? "今天" : upcoming ? `${upcoming.distance} 天后` : "休息"}
          </span>
        </div>

        {rows.length > 0 ? (
          <RowList rows={rows} />
        ) : (
          <p className="mt-4 rounded-xl bg-sunken px-3 py-3 text-[12px] leading-5 text-ink-2">
            {upcoming
              ? `下一次是 ${upcoming.day.name}，还有 ${upcoming.distance} 天。`
              : "这套计划还没排星期，去计划页把训练日排上。"}
          </p>
        )}

        <Link
          href={isTrainingDay ? "/plan" : "/plan"}
          className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-btn bg-brand text-[13px] font-semibold text-white"
        >
          {isTrainingDay ? "去训练" : "查看计划"}
          <ArrowRight className="size-3.5" />
        </Link>
      </CardShell>
      {weekChip}
    </div>
  );
}
