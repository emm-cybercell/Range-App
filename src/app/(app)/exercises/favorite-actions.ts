"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

/** 收藏 toggle：表已有复合主键，这里只做一次查 + 一次写 */
export async function toggleFavorite(exerciseId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "请先登录" };

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { slug: true },
  });
  if (!exercise) return { ok: false as const, message: "动作不存在" };

  const key = { accountId: account.id, exerciseId };
  const existing = await prisma.exerciseFavorite.findUnique({
    where: { accountId_exerciseId: key },
    select: { accountId: true },
  });

  if (existing) {
    await prisma.exerciseFavorite.delete({ where: { accountId_exerciseId: key } });
  } else {
    await prisma.exerciseFavorite.create({ data: key });
  }

  revalidatePath(`/exercises/${exercise.slug}`);
  return { ok: true as const, favorited: !existing };
}
