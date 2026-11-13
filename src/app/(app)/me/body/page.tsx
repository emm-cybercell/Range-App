import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { SubmitButton } from "@/components/submit-button";
import { deleteWeightForm, recordWeightForm } from "./actions";

const RANGES = [
  { key: "7", label: "7 天" },
  { key: "30", label: "30 天" },
  { key: "90", label: "90 天" },
];

function buildPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function BodyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const account = await requireAccount();
  if (!account) return null;

  const sp = await searchParams;
  const range = ["7", "30", "90"].includes(sp.range ?? "") ? (sp.range as string) : "30";
  const days = Number(range);

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));

  const [series, latest, profile] = await Promise.all([
    prisma.bodyMetric.findMany({
      where: { accountId: account.id, date: { gte: from } },
      orderBy: { date: "asc" },
    }),
    prisma.bodyMetric.findFirst({
      where: { accountId: account.id },
      orderBy: { date: "desc" },
    }),
    prisma.profile.findUnique({
      where: { accountId: account.id },
      select: { targetWeightKg: true, heightCm: true },
    }),
  ]);

  const weights = series.map((m) => Number(m.weightKg));
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 0;
  const span = Math.max(1, max - min);

  const chartW = 300;
  const chartH = 110;
  const points = series.map((m, i) => ({
    x: series.length === 1 ? chartW / 2 : (i / (series.length - 1)) * chartW,
    y: chartH - ((Number(m.weightKg) - min) / span) * (chartH - 16) - 8,
  }));

  const change =
    series.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null;

  const recent = await prisma.bodyMetric.findMany({
    where: { accountId: account.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="size-3.5" />
        我的
      </Link>

      <header className="mt-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">身体数据</h1>
          <p className="mt-1 text-sm text-ink-2">
            当前 {latest ? Number(latest.weightKg) : "—"} kg
            {profile?.targetWeightKg ? ` · 目标 ${Number(profile.targetWeightKg)} kg` : ""}
          </p>
        </div>
        {change !== null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              change === 0
                ? "bg-sunken text-ink-2"
                : change > 0
                  ? "bg-warn/10 text-warn"
                  : "bg-brand-soft text-brand"
            }`}
          >
            {change > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {change > 0 ? "+" : ""}
            {change} kg / {range} 天
          </span>
        ) : null}
      </header>

      {/* 快速记录 */}
      <form
        action={recordWeightForm}
        className="mt-4 flex items-end gap-2 rounded-card border border-line bg-surface p-4"
      >
        <div className="flex-1">
          <label htmlFor="weightKg" className="text-[11px] text-ink-3">
            今天的体重（kg）
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={30}
            max={250}
            required
            defaultValue={latest ? Number(latest.weightKg) : undefined}
            className="num mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] font-semibold outline-none focus:border-brand"
          />
        </div>
        <div className="w-24">
          <label htmlFor="bodyFatPct" className="text-[11px] text-ink-3">
            体脂 %（选填）
          </label>
          <input
            id="bodyFatPct"
            name="bodyFatPct"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={3}
            max={60}
            defaultValue={latest?.bodyFatPct ? Number(latest.bodyFatPct) : undefined}
            className="num mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-btn bg-brand px-4 text-sm font-semibold text-white"
        >
          记下
        </button>
      </form>

      {/* 趋势 */}
      <section className="mt-3 rounded-card border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">体重趋势</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/me/body?range=${r.key}`}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  range === r.key ? "bg-brand text-white" : "bg-sunken text-ink-2"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>

        {series.length >= 2 ? (
          <div className="mt-4">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-32 w-full" preserveAspectRatio="none">
              <path
                d={`${buildPath(points)} L${chartW},${chartH} L0,${chartH} Z`}
                fill="var(--brand-soft)"
                opacity="0.6"
              />
              <path
                d={buildPath(points)}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--brand)" />
              ))}
            </svg>
            <div className="num mt-1 flex justify-between text-[10px] text-ink-3">
              <span>{series[0].date.toISOString().slice(5, 10)}</span>
              <span>
                最低 {min} / 最高 {max}
              </span>
              <span>{series[series.length - 1].date.toISOString().slice(5, 10)}</span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-[12px] text-ink-3">
            {series.length === 1 ? "再记一次就能看到趋势" : "这段时间还没有记录"}
          </p>
        )}
      </section>

      {/* 记录 */}
      <section className="mt-3 rounded-card border border-line bg-surface">
        <h2 className="px-5 pt-4 text-sm font-semibold">记录</h2>
        {recent.length === 0 ? (
          <p className="px-5 pt-2 pb-4 text-[12px] text-ink-3">还没有记录</p>
        ) : (
          <ul className="mt-2 mb-2 divide-y divide-line px-5">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="num w-14 shrink-0 text-[11px] text-ink-3">
                  {m.date.toISOString().slice(5, 10)}
                </span>
                <span className="num flex-1 text-sm font-medium">{Number(m.weightKg)} kg</span>
                {m.bodyFatPct ? (
                  <span className="num text-[11px] text-ink-3">体脂 {Number(m.bodyFatPct)}%</span>
                ) : null}
                <form action={deleteWeightForm}>
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton
                    ariaLabel="删除这条记录"
                    pendingNode={<Loader2 className="size-3.5 animate-spin" />}
                    className="size-7 rounded-full text-ink-3 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
