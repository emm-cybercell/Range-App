"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { materializePlan } from "@/lib/plans";
import type { UserEquipment } from "@/lib/plan-templates";

export async function createPlanAction(formData: FormData) {
  const templateSlug = String(formData.get("templateSlug") ?? "");
  if (!templateSlug) redirect("/plan/templates");

  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { accountId: account.id },
    select: { daysPerWeek: true, equipment: true },
  });

  const result = await materializePlan({
    accountId: account.id,
    templateSlug,
    daysPerWeek: profile?.daysPerWeek ?? 4,
    equipment: (profile?.equipment ?? "GYM") as UserEquipment,
  });

  if (!result) redirect("/plan/templates?reason=equipment");
  redirect("/plan");
}

export async function deletePlanAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const account = await getCurrentAccount();
  if (!account || !planId) redirect("/plan");

  // 只软删自己的计划，历史训练记录不受影响
  await prisma.plan.updateMany({
    where: { id: planId, accountId: account.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  redirect("/plan/templates");
}
