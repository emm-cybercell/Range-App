"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

/** 计划编辑器里的一份完整草稿：服务端按数组顺序重写 order */
export type DraftExercise = {
  id: string | null;
  exerciseId: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
};

export type DraftDay = {
  id: string | null;
  name: string;
  weekday: number | null;
  exercises: DraftExercise[];
};

export type PlanDraft = {
  id: string;
  name: string;
  updatedAt: string;
  days: DraftDay[];
};

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const LIMITS = {
  nameMax: 40,
  dayNameMax: 20,
  daysMax: 7,
  exercisesPerDay: 15,
  setsMin: 1,
  setsMax: 10,
  repsMin: 1,
  repsMax: 100,
  restMax: 600,
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function currentAccountId() {
  const account = await getCurrentAccount();
  return account?.id ?? null;
}

/** 新建一份空白计划，成功后跳到编辑器 */
export async function createEmptyPlan(name?: string): Promise<ActionResult & { planId?: string }> {
  const accountId = await currentAccountId();
  if (!accountId) return { ok: false, message: "请先登录" };

  const planName = (name ?? "").trim().slice(0, LIMITS.nameMax) || "我的计划";
  const hasActive = await prisma.plan.count({ where: { accountId, isActive: true, deletedAt: null } });

  const plan = await prisma.plan.create({
    data: {
      accountId,
      name: planName,
      isActive: hasActive === 0,
      sourceTemplateId: null,
      // 预置一个训练日：空计划直接点保存会因"至少一个训练日"被拦，体验很差
      days: { create: [{ name: "训练日 1", weekday: 1, order: 1 }] },
    },
  });

  revalidatePath("/plan");
  return { ok: true, planId: plan.id };
}

/** 全量保存：以草稿为准覆盖训练日与动作 */
export async function savePlan(draft: PlanDraft): Promise<ActionResult> {
  const accountId = await currentAccountId();
  if (!accountId) return { ok: false, message: "请先登录" };

  const plan = await prisma.plan.findFirst({
    where: { id: draft.id, accountId, deletedAt: null },
    select: { id: true, updatedAt: true },
  });
  if (!plan) return { ok: false, message: "计划不存在或无权访问" };

  // 乐观锁：别处改过就拒绝，避免互相覆盖
  if (draft.updatedAt && plan.updatedAt.toISOString() !== draft.updatedAt) {
    return { ok: false, message: "计划已在别处修改，请刷新后再编辑" };
  }

  const name = draft.name.trim().slice(0, LIMITS.nameMax);
  if (!name) return { ok: false, message: "计划名称不能为空" };

  const days = draft.days.slice(0, LIMITS.daysMax);
  if (days.length === 0) return { ok: false, message: "至少保留一个训练日" };

  const weekdays = days.map((d) => d.weekday).filter((w): w is number => typeof w === "number");
  if (new Set(weekdays).size !== weekdays.length) {
    return { ok: false, message: "同一个星期只能安排一个训练日" };
  }

  for (const day of days) {
    if (!day.name.trim()) return { ok: false, message: "训练日名称不能为空" };
    if (day.name.trim().length > LIMITS.dayNameMax) {
      return { ok: false, message: `训练日名称不超过 ${LIMITS.dayNameMax} 字` };
    }
    if (day.exercises.length > LIMITS.exercisesPerDay) {
      return { ok: false, message: `每个训练日最多 ${LIMITS.exercisesPerDay} 个动作` };
    }
    const ids = new Set<string>();
    for (const item of day.exercises) {
      if (ids.has(item.exerciseId)) return { ok: false, message: "同一个训练日里动作不能重复" };
      ids.add(item.exerciseId);
    }
  }

  // 动作归属校验：只允许启用中的动作
  const allExerciseIds = [...new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))];
  if (allExerciseIds.length > 0) {
    const found = await prisma.exercise.count({ where: { id: { in: allExerciseIds }, active: true } });
    if (found !== allExerciseIds.length) return { ok: false, message: "包含已下架的动作，请移除后重试" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.plan.update({ where: { id: plan.id }, data: { name } });

    const keepDayIds: string[] = [];
    for (const [dayIndex, day] of days.entries()) {
      const dayData = {
        name: day.name.trim(),
        weekday: day.weekday ?? null,
        order: dayIndex + 1,
      };
      const savedDay = day.id
        ? await tx.planDay.update({ where: { id: day.id }, data: dayData })
        : await tx.planDay.create({ data: { ...dayData, planId: plan.id } });
      keepDayIds.push(savedDay.id);

      const keepExerciseIds: string[] = [];
      for (const [itemIndex, item] of day.exercises.entries()) {
        const sets = clampInt(item.targetSets, LIMITS.setsMin, LIMITS.setsMax, 3);
        const repsMin = clampInt(item.repsMin, LIMITS.repsMin, LIMITS.repsMax, 8);
        const repsMax = clampInt(item.repsMax, repsMin, LIMITS.repsMax, Math.max(repsMin, 12));
        const restSec = clampInt(item.restSec, 0, LIMITS.restMax, 90);
        const payload = {
          targetSets: sets,
          repsMin,
          repsMax,
          restSec,
          order: itemIndex + 1,
        };
        const saved = item.id
          ? await tx.planExercise.update({ where: { id: item.id }, data: payload })
          : await tx.planExercise.create({
              data: { ...payload, planDayId: savedDay.id, exerciseId: item.exerciseId },
            });
        keepExerciseIds.push(saved.id);
      }
      // 训练日不能删了重建（会打断历史会话的 planDayId），只清理多余动作
      await tx.planExercise.deleteMany({
        where: { planDayId: savedDay.id, id: { notIn: keepExerciseIds.length ? keepExerciseIds : ["__none__"] } },
      });
    }

    await tx.planDay.deleteMany({
      where: { planId: plan.id, id: { notIn: keepDayIds.length ? keepDayIds : ["__none__"] } },
    });
  });

  revalidatePath("/plan");
  revalidatePath(`/plan/${plan.id}/edit`);
  revalidatePath("/home");
  return { ok: true, message: "已保存" };
}

/** 切换当前计划：保证同一账号下最多一个 isActive */
export async function setActivePlan(planId: string): Promise<ActionResult> {
  const accountId = await currentAccountId();
  if (!accountId) return { ok: false, message: "请先登录" };

  const plan = await prisma.plan.findFirst({
    where: { id: planId, accountId, deletedAt: null },
    select: { id: true },
  });
  if (!plan) return { ok: false, message: "计划不存在" };

  await prisma.$transaction([
    prisma.plan.updateMany({ where: { accountId, isActive: true }, data: { isActive: false } }),
    prisma.plan.update({ where: { id: plan.id }, data: { isActive: true } }),
  ]);

  revalidatePath("/plan");
  revalidatePath("/home");
  return { ok: true };
}

/** 复制整份计划（含训练日与动作） */
export async function duplicatePlan(planId: string): Promise<ActionResult & { planId?: string }> {
  const accountId = await currentAccountId();
  if (!accountId) return { ok: false, message: "请先登录" };

  const source = await prisma.plan.findFirst({
    where: { id: planId, accountId, deletedAt: null },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!source) return { ok: false, message: "计划不存在" };

  const copyName = `${source.name} 副本`.slice(0, LIMITS.nameMax);
  const created = await prisma.plan.create({
    data: {
      accountId,
      name: copyName,
      isActive: false,
      sourceTemplateId: null,
      days: {
        create: source.days.map((day, dayIndex) => ({
          name: day.name,
          weekday: day.weekday,
          order: dayIndex + 1,
          exercises: {
            create: day.exercises.map((item, itemIndex) => ({
              exerciseId: item.exerciseId,
              order: itemIndex + 1,
              targetSets: item.targetSets,
              repsMin: item.repsMin,
              repsMax: item.repsMax,
              restSec: item.restSec,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/plan");
  return { ok: true, planId: created.id, message: "已复制" };
}

/** 软删除；删的是当前计划时自动把最近更新的一份设为当前 */
export async function deletePlan(planId: string): Promise<ActionResult> {
  const accountId = await currentAccountId();
  if (!accountId) return { ok: false, message: "请先登录" };

  const plan = await prisma.plan.findFirst({
    where: { id: planId, accountId, deletedAt: null },
    select: { id: true, isActive: true },
  });
  if (!plan) return { ok: false, message: "计划不存在" };

  await prisma.$transaction(async (tx) => {
    await tx.plan.update({ where: { id: plan.id }, data: { deletedAt: new Date(), isActive: false } });
    if (plan.isActive) {
      const next = await tx.plan.findFirst({
        where: { accountId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.plan.update({ where: { id: next.id }, data: { isActive: true } });
    }
  });

  revalidatePath("/plan");
  revalidatePath("/home");
  return { ok: true, message: "已删除" };
}

export type ExerciseHit = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  muscle: string;
};

/** 编辑器里的动作搜索：名称 / 英文名 / 全拼 / 首字母 */
export async function searchExercises(query: string, bodyPart?: string): Promise<ExerciseHit[]> {
  const accountId = await currentAccountId();
  if (!accountId) return [];

  const q = query.trim();
  const rows = await prisma.exercise.findMany({
    where: {
      active: true,
      ...(bodyPart ? { bodyPart: bodyPart as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { nameEn: { contains: q, mode: "insensitive" as const } },
              { pinyin: { contains: q.toLowerCase() } },
              { pinyinInitials: { contains: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      bodyPart: true,
      equipment: true,
      primaryMuscle: { select: { name: true } },
    },
    orderBy: [{ bodyPart: "asc" }, { name: "asc" }],
    take: 20,
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    bodyPart: r.bodyPart,
    equipment: r.equipment,
    muscle: r.primaryMuscle.name,
  }));
}
