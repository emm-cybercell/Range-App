"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { onboardingSchema } from "@/lib/validators";
import { todayString, parseDate } from "@/lib/date";

export async function saveOnboarding(_prev: unknown, formData: FormData) {
  // 缺字段时先给一句人话，避免把校验库的原始报错（如 NaN）暴露给用户
  const required = ["sex", "age", "heightCm", "weightKg", "goal", "daysPerWeek", "equipment", "level"];
  if (required.some((key) => !String(formData.get(key) ?? "").trim())) {
    return { error: "身体数据和训练目标还没填完" };
  }

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入有误" };
  }

  const account = await getCurrentAccount();
  if (!account) return { error: "会话已失效，请刷新页面重试" };

  const d = parsed.data;
  const today = parseDate(todayString());

  const profileData = {
    sex: d.sex,
    age: d.age,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    goal: d.goal,
    daysPerWeek: d.daysPerWeek,
    equipment: d.equipment,
    level: d.level,
    targetWeightKg: d.targetWeightKg,
    completedAt: new Date(),
  };

  await prisma.$transaction([
    prisma.profile.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id, ...profileData },
      update: profileData,
    }),
    // 建档时的体重自动成为第一条身体记录，同日不覆盖已有数据
    prisma.bodyMetric.upsert({
      where: { accountId_date: { accountId: account.id, date: today } },
      create: { accountId: account.id, date: today, weightKg: d.weightKg },
      update: {},
    }),
  ]);

  redirect("/plan/templates");
}
