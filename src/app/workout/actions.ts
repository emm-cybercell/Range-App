"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { finishWorkout, startWorkout } from "@/lib/workouts";

const clampWeight = (v: number) => Math.min(500, Math.max(0, Math.round(v * 100) / 100));
const clampReps = (v: number) => Math.min(100, Math.max(1, Math.round(v)));

export async function startWorkoutAction(formData: FormData) {
  const planDayId = String(formData.get("planDayId") ?? "");
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const result = await startWorkout(account.id, planDayId);
  if (result.kind === "error") redirect("/plan");
  redirect(`/workout/${result.sessionId}`);
}

async function ownedWorkoutExercise(workoutExerciseId: string, accountId: string) {
  return prisma.workoutExercise.findFirst({
    where: { id: workoutExerciseId, session: { accountId, status: "ACTIVE" } },
    select: { id: true, sessionId: true },
  });
}

export async function addSetAction(input: {
  workoutExerciseId: string;
  weightKg: number;
  reps: number;
  isWarmup?: boolean;
}) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const owned = await ownedWorkoutExercise(input.workoutExerciseId, account.id);
  if (!owned) return { ok: false as const, message: "这次训练已经结束了" };

  const last = await prisma.workoutSet.findFirst({
    where: { workoutExerciseId: input.workoutExerciseId },
    orderBy: { setIndex: "desc" },
    select: { setIndex: true },
  });

  const created = await prisma.workoutSet.create({
    data: {
      workoutExerciseId: input.workoutExerciseId,
      setIndex: (last?.setIndex ?? 0) + 1,
      weightKg: clampWeight(input.weightKg),
      reps: clampReps(input.reps),
      isWarmup: input.isWarmup ?? false,
    },
  });

  return {
    ok: true as const,
    set: {
      id: created.id,
      setIndex: created.setIndex,
      weightKg: Number(created.weightKg),
      reps: created.reps,
      isWarmup: created.isWarmup,
    },
  };
}

export async function updateSetAction(input: {
  setId: string;
  weightKg: number;
  reps: number;
}) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const owned = await prisma.workoutSet.findFirst({
    where: { id: input.setId, workoutExercise: { session: { accountId: account.id } } },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "找不到这条记录" };

  await prisma.workoutSet.update({
    where: { id: input.setId },
    data: { weightKg: clampWeight(input.weightKg), reps: clampReps(input.reps) },
  });

  return { ok: true as const };
}

export async function deleteSetAction(setId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const owned = await prisma.workoutSet.findFirst({
    where: { id: setId, workoutExercise: { session: { accountId: account.id } } },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "找不到这条记录" };

  await prisma.workoutSet.delete({ where: { id: setId } });
  return { ok: true as const };
}

export async function toggleSkipAction(workoutExerciseId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const owned = await ownedWorkoutExercise(workoutExerciseId, account.id);
  if (!owned) return { ok: false as const, message: "这次训练已经结束了" };

  const current = await prisma.workoutExercise.findUnique({
    where: { id: workoutExerciseId },
    select: { status: true },
  });

  const next = current?.status === "SKIPPED" ? "PENDING" : "SKIPPED";
  await prisma.workoutExercise.update({
    where: { id: workoutExerciseId },
    data: { status: next },
  });

  return { ok: true as const, status: next };
}

export async function finishWorkoutAction(sessionId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const done = await finishWorkout(account.id, sessionId);
  if (!done) return { ok: false as const, message: "这次训练已经结束了" };

  revalidatePath("/home");
  revalidatePath("/plan");
  return { ok: true as const };
}

export async function abandonWorkoutAction(sessionId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  await prisma.workoutSession.updateMany({
    where: { id: sessionId, accountId: account.id, status: "ACTIVE" },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });

  redirect("/plan");
}
