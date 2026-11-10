"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { parseDate, todayString } from "@/lib/date";

const clampWeight = (v: number) => Math.min(250, Math.max(30, Math.round(v * 10) / 10));

/** 记录体重：同一天重复录入走覆盖 */
export async function recordWeight(input: { weightKg: number; date?: string; bodyFatPct?: number }) {  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  if (!Number.isFinite(input.weightKg) || input.weightKg < 30 || input.weightKg > 250) {
    return { ok: false as const, message: "体重需在 30–250 kg" };
  }

  const dateKey = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : todayString();
  const date = parseDate(dateKey);
  const weightKg = clampWeight(input.weightKg);
  const bodyFatPct =
    input.bodyFatPct && input.bodyFatPct > 0 && input.bodyFatPct < 70
      ? Math.round(input.bodyFatPct * 10) / 10
      : null;

  await prisma.bodyMetric.upsert({
    where: { accountId_date: { accountId: account.id, date } },
    create: { accountId: account.id, date, weightKg, bodyFatPct },
    update: { weightKg, bodyFatPct },
  });

  revalidatePath("/home");
  revalidatePath("/me/body");
  return { ok: true as const, weightKg };
}

/** 表单版本：用于无 JS 也能提交的 <form action> */
export async function recordWeightForm(formData: FormData) {
  const weightKg = Number(formData.get("weightKg"));
  const bodyFatPct = Number(formData.get("bodyFatPct"));
  await recordWeight({
    weightKg,
    bodyFatPct: Number.isFinite(bodyFatPct) && bodyFatPct > 0 ? bodyFatPct : undefined,
  });
}

export async function deleteWeightForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteWeight(id);
}

export async function deleteWeight(id: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  await prisma.bodyMetric.deleteMany({ where: { id, accountId: account.id } });
  revalidatePath("/home");
  revalidatePath("/me/body");
  return { ok: true as const };
}
