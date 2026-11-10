"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

/** 清空全部训练记录（保留计划与账号） */
export async function clearWorkoutHistory() {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  await prisma.workoutSession.deleteMany({ where: { accountId: account.id } });

  revalidatePath("/home");
  revalidatePath("/stats");
  revalidatePath("/plan");
  return { ok: true as const };
}

/** 清空全部饮食记录 */
export async function clearMealHistory() {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  await prisma.mealEntry.deleteMany({ where: { accountId: account.id } });
  await prisma.waterLog.deleteMany({ where: { accountId: account.id } });

  revalidatePath("/home");
  revalidatePath("/nutrition");
  return { ok: true as const };
}
