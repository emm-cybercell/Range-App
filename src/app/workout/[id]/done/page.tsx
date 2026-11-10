import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { getSession, weeklyCompletedCount } from "@/lib/workouts";
import { todayString } from "@/lib/date";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function WorkoutDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await requireAccount();
  if (!account) redirect("/login");

  const session = await getSession(account.id, id);
  if (!session) notFound();
  if (session.status === "ACTIVE") redirect(`/workout/${id}`);

  const [weekly, quoteCount] = await Promise.all([
    weeklyCompletedCount(account.id),
    prisma.quote.count({ where: { active: true } }),
  ]);

  const dayIndex = Number(todayString().replace(/-/g, "")) % Math.max(quoteCount, 1);
  const quote = await prisma.quote.findFirst({
    where: { active: true },
    orderBy: { order: "asc" },
    skip: dayIndex,
  });

  const volume = Number(session.totalVolumeKg ?? 0);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-full bg-brand text-white">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {session.dayNameSnapshot ?? "训练"}完成
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">本周第 {weekly} 练</p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 rounded-card border border-line bg-surface p-4 text-center">
        {[
          ["时长", formatDuration(session.durationSec ?? 0)],
          ["容量", `${Math.round(volume).toLocaleString()} kg`],
          ["组数", `${session.totalSets ?? 0}`],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] text-ink-3">{label}</p>
            <p className="num mt-1 text-[15px] font-bold">{value}</p>
          </div>
        ))}
      </div>

      {quote ? (
        <p className="mt-6 text-center text-[15px] leading-6 font-medium">「{quote.text}」</p>
      ) : null}

      <div className="mt-10 space-y-2.5">
        <Link
          href="/home"
          className="flex h-12 items-center justify-center rounded-btn bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          回到首页
        </Link>
        <Link
          href="/plan"
          className="flex h-12 items-center justify-center rounded-btn border border-line text-sm font-medium text-ink-2"
        >
          看完整计划
        </Link>
      </div>
    </div>
  );
}
