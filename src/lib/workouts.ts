import { prisma } from "@/lib/db";
import { isoWeekday } from "@/lib/plans";
import { todayString, parseDate, nowMs } from "@/lib/date";

export type LastPerformance = {
  date: string;
  sets: { weightKg: number; reps: number; isWarmup: boolean }[];
};

/** 找出这些动作最近一次已完成训练里的成绩，用于「上次 60kg × 10」提示 */
export async function loadLastPerformance(accountId: string, exerciseIds: string[]) {
  const map = new Map<string, LastPerformance>();
  if (exerciseIds.length === 0) return map;

  const sets = await prisma.workoutSet.findMany({
    where: {
      workoutExercise: {
        exerciseId: { in: exerciseIds },
        session: { accountId, status: "COMPLETED" },
      },
    },
    select: {
      weightKg: true,
      reps: true,
      isWarmup: true,
      completedAt: true,
      workoutExercise: {
        select: {
          exerciseId: true,
          session: { select: { date: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 400,
  });

  for (const s of sets) {
    const exerciseId = s.workoutExercise.exerciseId;
    if (!exerciseId) continue;
    const dateKey = s.workoutExercise.session.date.toISOString().slice(0, 10);
    const existing = map.get(exerciseId);

    // 只保留最近那一天的数据，同一天内按完成顺序排列
    if (!existing) {
      map.set(exerciseId, {
        date: dateKey,
        sets: [{ weightKg: Number(s.weightKg), reps: s.reps, isWarmup: s.isWarmup }],
      });
    } else if (existing.date === dateKey) {
      existing.sets.push({ weightKg: Number(s.weightKg), reps: s.reps, isWarmup: s.isWarmup });
    }
  }

  for (const value of map.values()) value.sets.reverse();
  return map;
}

export type StartResult =
  | { kind: "created"; sessionId: string }
  | { kind: "existing"; sessionId: string }
  | { kind: "error"; message: string };

/**
 * 开始训练。同一时刻只允许一个 ACTIVE 会话；
 * 计划动作在这里做快照，之后计划被改动不影响本次记录。
 */
export async function startWorkout(accountId: string, planDayId: string): Promise<StartResult> {
  const active = await prisma.workoutSession.findFirst({
    where: { accountId, status: "ACTIVE" },
    select: { id: true },
  });
  if (active) return { kind: "existing", sessionId: active.id };

  const day = await prisma.planDay.findFirst({
    where: { id: planDayId, plan: { accountId, deletedAt: null } },
    include: {
      plan: { select: { id: true, name: true } },
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              bodyPart: true,
              equipment: true,
              primaryMuscle: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!day) return { kind: "error", message: "找不到这个训练日" };
  if (day.exercises.length === 0) return { kind: "error", message: "这个训练日还没有动作" };

  const session = await prisma.workoutSession.create({
    data: {
      accountId,
      planId: day.plan.id,
      planDayId: day.id,
      planNameSnapshot: day.plan.name,
      dayNameSnapshot: day.name,
      date: parseDate(todayString()),
      exercises: {
        create: day.exercises.map((item) => ({
          exerciseId: item.exerciseId,
          exerciseNameSnapshot: item.exercise.name,
          bodyPartSnapshot: item.exercise.bodyPart,
          muscleNameSnapshot: item.exercise.primaryMuscle.name,
          equipmentSnapshot: item.exercise.equipment,
          order: item.order,
          targetSets: item.targetSets,
          repsMin: item.repsMin,
          repsMax: item.repsMax,
          restSec: item.restSec,
        })),
      },
    },
    select: { id: true },
  });

  return { kind: "created", sessionId: session.id };
}

/** 会话已进行的秒数（由服务端时间推导，避免前端计时器漂移） */
export function elapsedSeconds(startedAt: Date) {
  return Math.max(0, Math.round((nowMs() - startedAt.getTime()) / 1000));
}

export async function getActiveSessionId(accountId: string) {  const active = await prisma.workoutSession.findFirst({
    where: { accountId, status: "ACTIVE" },
    select: { id: true },
    orderBy: { startedAt: "desc" },
  });
  return active?.id ?? null;
}

/** 训练页数据：会话 + 动作 + 已记录的组 */
export async function getSession(accountId: string, sessionId: string) {
  return prisma.workoutSession.findFirst({
    where: { id: sessionId, accountId },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { sets: { orderBy: { setIndex: "asc" } } },
      },
    },
  });
}

/** 完成训练：服务端重算时长与容量，避免前端口径不一致 */
export async function finishWorkout(accountId: string, sessionId: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, accountId, status: "ACTIVE" },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) return null;

  let volume = 0;
  let totalSets = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.isWarmup) continue;
      volume += Number(set.weightKg) * set.reps;
      totalSets += 1;
    }
  }

  const finishedAt = new Date();
  const durationSec = Math.max(
    0,
    Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000),
  );

  return prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      finishedAt,
      durationSec,
      totalVolumeKg: Math.round(volume * 100) / 100,
      totalSets,
    },
  });
}

/** 本周已完成的训练次数 */
export async function weeklyCompletedCount(accountId: string) {
  const today = isoWeekday();
  const start = new Date();
  start.setDate(start.getDate() - (today - 1));
  const startKey = `${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, "0")}-${`${start.getDate()}`.padStart(2, "0")}`;

  return prisma.workoutSession.count({
    where: {
      accountId,
      status: "COMPLETED",
      date: { gte: parseDate(startKey) },
    },
  });
}
