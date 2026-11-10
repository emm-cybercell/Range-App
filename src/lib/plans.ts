import { prisma } from "@/lib/db";
import {
  buildSchedule,
  canDoExercise,
  estimateMinutes,
  TEMPLATES,
  type PlanTemplate,
  type UserEquipment,
} from "@/lib/plan-templates";

/** 一个动作的「模板 → 实际动作」解析：器械不兼容时换成本肌肉群的替代动作 */
type ExerciseLite = {
  id: string;
  slug: string;
  equipment: string;
  primaryMuscleId: string;
};

async function resolveExerciseMap() {
  const [exercises, alternatives] = await Promise.all([
    prisma.exercise.findMany({
      where: { active: true },
      select: { id: true, slug: true, equipment: true, primaryMuscleId: true },
    }),
    prisma.exerciseAlternative.findMany({
      select: { fromId: true, toId: true },
    }),
  ]);

  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const altMap = new Map<string, string[]>();
  for (const a of alternatives) {
    const list = altMap.get(a.fromId) ?? [];
    list.push(a.toId);
    altMap.set(a.fromId, list);
  }
  return { bySlug, byId, altMap };
}

/**
 * 替代动作必须练同一块肌肉，否则宁可不换。
 * 例如小腿提踵没有同肌肉群的哑铃替代动作时，直接丢弃，而不是塞一个深蹲进去。
 */
function pickExercise(
  slug: string,
  user: UserEquipment,
  maps: Awaited<ReturnType<typeof resolveExerciseMap>>,
): ExerciseLite | null {
  const original = maps.bySlug.get(slug);
  if (!original) return null;
  if (canDoExercise(user, original.equipment as never)) return original;

  for (const altId of maps.altMap.get(original.id) ?? []) {
    const alt = maps.byId.get(altId);
    if (!alt) continue;
    if (alt.primaryMuscleId !== original.primaryMuscleId) continue;
    if (canDoExercise(user, alt.equipment as never)) return alt;
  }
  return null;
}

export type MaterializeResult = {
  planId: string;
  substituted: number;
  dropped: number;
};

/**
 * 把模板落成用户的真实计划。
 * 器械不兼容的动作先用替代动作替换，替换不了才丢弃，并回报数量。
 */
export async function materializePlan(options: {
  accountId: string;
  templateSlug: string;
  daysPerWeek: number;
  equipment: UserEquipment;
}): Promise<MaterializeResult | null> {
  const template = TEMPLATES.find((t) => t.slug === options.templateSlug) as PlanTemplate | undefined;
  if (!template) return null;

  const maps = await resolveExerciseMap();
  const schedule = buildSchedule(template, options.daysPerWeek);

  let substituted = 0;
  let dropped = 0;

  const days = schedule.map(({ weekday, day, order }) => {
    const used = new Set<string>();
    const exercises = [];

    for (const item of day.exercises) {
      const picked = pickExercise(item.slug, options.equipment, maps);
      if (!picked) {
        dropped += 1;
        continue;
      }
      if (used.has(picked.id)) continue;
      used.add(picked.id);

      const original = maps.bySlug.get(item.slug);
      if (original && original.id !== picked.id) substituted += 1;

      exercises.push({
        exerciseId: picked.id,
        order: exercises.length + 1,
        targetSets: item.sets,
        repsMin: item.repsMin,
        repsMax: item.repsMax,
        restSec: item.restSec,
      });
    }

    return { name: day.name, weekday, order, exercises };
  });

  // 器械不足会让某个训练日只剩一两个动作，那样的计划没法执行，直接拒绝
  if (days.some((d) => d.exercises.length < 3)) return null;

  const plan = await prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({ where: { accountId: options.accountId }, data: { isActive: false } });

    return tx.plan.create({
      data: {
        accountId: options.accountId,
        name: template.name,
        isActive: true,
        sourceTemplateId: template.slug,
        days: {
          create: days.map((d) => ({
            name: d.name,
            weekday: d.weekday,
            order: d.order,
            exercises: { create: d.exercises },
          })),
        },
      },
    });
  });

  return { planId: plan.id, substituted, dropped };
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>;

export async function getActivePlan(accountId: string) {
  return prisma.plan.findFirst({
    where: { accountId, isActive: true, deletedAt: null },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: {
                select: {
                  slug: true,
                  name: true,
                  bodyPart: true,
                  equipment: true,
                  primaryMuscle: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** ISO 星期：1=周一 … 7=周日 */
export function isoWeekday(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * 今天的训练日。
 * 指定了星期就按星期取；今天不是训练日时，返回下一个训练日用于预告。
 */
export async function getTodayPlan(accountId: string) {
  const plan = await getActivePlan(accountId);
  if (!plan) return { plan: null, day: null, isTrainingDay: false, upcoming: null };

  const today = isoWeekday();
  const day = plan.days.find((d) => d.weekday === today) ?? null;

  if (day) return { plan, day, isTrainingDay: true, upcoming: null };

  const upcoming =
    plan.days
      .filter((d) => d.weekday !== null)
      .map((d) => ({ day: d, distance: ((d.weekday as number) - today + 7) % 7 }))
      .sort((a, b) => a.distance - b.distance)[0] ?? null;

  return { plan, day: null, isTrainingDay: false, upcoming };
}

export function planDayMinutes(day: ActivePlan["days"][number]) {
  return estimateMinutes({
    name: day.name,
    exercises: day.exercises.map((e) => ({
      slug: e.exercise.slug,
      sets: e.targetSets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      restSec: e.restSec,
    })),
  });
}
