import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { FavoriteButton } from "./favorite-button";

const BODY_PART_LABEL: Record<string, string> = {
  CHEST: "胸",
  BACK: "背",
  SHOULDERS: "肩",
  ARMS: "手臂",
  LEGS: "腿",
  CORE: "核心",
};

const EQUIPMENT_LABEL: Record<string, string> = {
  BARBELL: "杠铃",
  DUMBBELL: "哑铃",
  MACHINE: "器械",
  CABLE: "绳索",
  BODYWEIGHT: "自重",
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "新手",
  INTERMEDIATE: "进阶",
  ADVANCED: "老手",
};

// 详情页依赖 params 与登录态，暂按请求渲染（后续改 generateStaticParams 预渲染）
export const instant = false;

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: { slug },
    include: {
      primaryMuscle: { select: { name: true } },
      secondaryMuscles: { include: { muscle: { select: { name: true } } } },
      alternativesFrom: {
        include: {
          to: { select: { slug: true, name: true, bodyPart: true, equipment: true } },
        },
      },
    },
  });

  if (!exercise) notFound();

  const account = await requireAccount();
  const favorited = account
    ? Boolean(
        await prisma.exerciseFavorite.findUnique({
          where: { accountId_exerciseId: { accountId: account.id, exerciseId: exercise.id } },
          select: { accountId: true },
        }),
      )
    : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        动作库
      </Link>

      {/* 演示：有动图就播动图，否则退回静态封面。动图必须用原生 img，next/image 会把 GIF 压成静帧 */}
      <div className="mt-4 overflow-hidden rounded-card border border-line bg-sunken">
        <div className="grid h-[240px] place-items-center">
          {exercise.demoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 动图必须原生 img，优化器会把 GIF 压成静帧
            <img
              src={exercise.demoUrl}
              alt={exercise.name + " 动作演示"}
              width={240}
              height={240}
              className="size-[240px] object-contain"
            />
          ) : exercise.coverUrl ? (
            <Image
              src={exercise.coverUrl}
              alt={exercise.name}
              width={240}
              height={240}
              className="size-[240px] rounded-lg object-contain"
              priority
            />
          ) : (
            <span className="text-5xl font-bold text-ink-3/60">{exercise.name.slice(0, 1)}</span>
          )}
        </div>
        {exercise.mediaCredit ? (
          <p className="border-t border-line px-3 py-1.5 text-center text-[10px] text-ink-3">
            <a
              href={exercise.mediaCredit.includes("Gym visual") ? "https://gymvisual.com/" : "https://gymbells.app/"}
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-2"
            >
              {exercise.mediaCredit}
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{exercise.name}</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">{exercise.nameEn}</p>
        </div>
        <FavoriteButton exerciseId={exercise.id} initialFavorited={favorited} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
          {BODY_PART_LABEL[exercise.bodyPart]} · {exercise.primaryMuscle.name}
        </span>
        <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] text-ink-2">
          {EQUIPMENT_LABEL[exercise.equipment]}
        </span>
        <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] text-ink-2">
          {LEVEL_LABEL[exercise.level]}
        </span>
        <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] text-ink-2">
          {exercise.kind === "COMPOUND" ? "复合动作" : "孤立动作"}
        </span>
      </div>

      {exercise.secondaryMuscles.length > 0 ? (
        <p className="mt-3 text-[12px] text-ink-3">
          协同肌：{exercise.secondaryMuscles.map((s) => s.muscle.name).join("、")}
        </p>
      ) : null}

      {/* 步骤 */}
      <section className="mt-7">
        <h2 className="text-base font-semibold">怎么做</h2>
        <ol className="mt-3 space-y-2.5">
          {exercise.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="num mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                {i + 1}
              </span>
              <span className="text-sm leading-6 text-ink">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 要点 */}
      {exercise.tips.length > 0 ? (
        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">关键要点</h2>
          <ul className="mt-2.5 space-y-2">
            {exercise.tips.map((tip, i) => (
              <li key={i} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.4} />
                <span className="text-sm leading-6 text-ink-2">{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 常见错误 */}
      {exercise.mistakes.length > 0 ? (
        <section className="mt-3 rounded-card border border-danger/20 bg-danger/5 p-4">
          <h2 className="text-sm font-semibold text-danger">常见错误</h2>
          <ul className="mt-2.5 space-y-2">
            {exercise.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2.4} />
                <span className="text-sm leading-6 text-ink-2">{m}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 替代动作 */}
      {exercise.alternativesFrom.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">做不了？换成这些</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {exercise.alternativesFrom.map(({ to }) => (
              <Link
                key={to.slug}
                href={`/exercises/${to.slug}`}
                className="min-w-[150px] shrink-0 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-brand/40"
              >
                <p className="text-sm font-medium">{to.name}</p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {BODY_PART_LABEL[to.bodyPart]} · {EQUIPMENT_LABEL[to.equipment]}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
