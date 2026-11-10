import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, Dumbbell, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { estimateMinutes, recommendTemplates, type UserEquipment } from "@/lib/plan-templates";
import { createPlanAction, startBlankPlanAction } from "../actions";

const EQUIPMENT_LABEL: Record<UserEquipment, string> = {
  GYM: "健身房",
  DUMBBELL: "哑铃 + 徒手",
  BODYWEIGHT: "纯徒手",
};

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function PlanTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const account = await requireAccount();
  if (!account) return null;

  const profile = await prisma.profile.findUnique({
    where: { accountId: account.id },
    select: { goal: true, daysPerWeek: true, equipment: true, level: true },
  });

  const options = recommendTemplates({
    goal: profile?.goal ?? null,
    daysPerWeek: profile?.daysPerWeek ?? null,
    equipment: (profile?.equipment ?? "GYM") as UserEquipment,
    level: profile?.level ?? null,
  });

  const dayCount = profile?.daysPerWeek ?? 4;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <Link
        href="/plan"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        我的计划
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">选一套计划</h1>
      <p className="mt-1.5 text-sm text-ink-2">
        按你每周 {dayCount} 天、{EQUIPMENT_LABEL[(profile?.equipment ?? "GYM") as UserEquipment]}
        的条件排好了顺序。选中后可以随时换。
      </p>

      {sp.reason === "equipment" ? (
        <p className="mt-5 rounded-xl bg-warn/10 px-3.5 py-2.5 text-[13px] text-warn">
          这套计划需要的器械不够，换一套更合适的试试。
        </p>
      ) : null}

      <form action={startBlankPlanAction} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-brand/50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Plus className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">从空白开始</span>
            <span className="mt-0.5 block text-[12px] text-ink-2">
              自己排训练日、挑动作、定组数，完全按你的习惯来
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-3" />
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {options.map((t) => {
          const avgMinutes = Math.round(
            t.days.reduce((sum, d) => sum + estimateMinutes(d), 0) / t.days.length,
          );
          const totalExercises = t.days.reduce((sum, d) => sum + d.exercises.length, 0);

          return (
            <div
              key={t.slug}
              className={`rounded-card border bg-surface p-5 ${
                t.recommended ? "border-brand/40" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{t.name}</h2>
                    {t.recommended ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                        推荐
                      </span>
                    ) : null}
                    {!t.compatible ? (
                      <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-3">
                        {t.reason}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">{t.subtitle}</p>
                </div>

                <span className="shrink-0 text-right">
                  <span className="num block text-lg font-bold">{t.days.length}</span>
                  <span className="block text-[10px] text-ink-3">训练日</span>
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-ink-2">{t.description}</p>

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
                  {t.days.map((d) => d.name).join(" / ")}
                </span>
              </div>

              <form action={createPlanAction} className="mt-4">
                <input type="hidden" name="templateSlug" value={t.slug} />
                <button
                  type="submit"
                  className={`h-11 w-full rounded-btn text-sm font-semibold transition-colors ${
                    t.recommended
                      ? "bg-brand text-white hover:bg-brand-hover"
                      : "border border-line bg-surface text-ink hover:border-ink-3/40"
                  }`}
                >
                  用这套计划
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
