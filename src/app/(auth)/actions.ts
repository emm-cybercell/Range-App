"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { migrateGuestData } from "@/lib/account";
import { clearSession, hashPassword, readGuestKey, verifyPassword, writeSession } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validators";

export async function registerAction(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nickname: formData.get("nickname"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入有误" };
  }

  const { email, password, nickname } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    return { error: "这个邮箱已经注册过了，直接登录？" };
  }

  const passwordHash = await hashPassword(password);

  const account = await prisma.account.create({
    data: {
      type: "USER",
      email,
      passwordHash,
      nickname,
      setting: { create: {} },
    },
  });

  // 游客时代的数据整体迁到新账号，用户不会有"记录不见了"的体验
  const guestId = await readGuestKey();
  if (guestId) {
    try {
      await migrateGuestData(guestId, account.id);
    } catch {
      // 迁移失败不应阻断注册，游客数据仍保留在原账号下
    }
  }

  await writeSession(account.id, "USER");
  redirect("/onboarding");
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入有误" };
  }

  const account = await prisma.account.findFirst({
    where: { email: parsed.data.email, deletedAt: null },
    select: { id: true, passwordHash: true, profile: { select: { completedAt: true } } },
  });

  // 邮箱不存在与密码错误返回同一句提示，避免探测已注册邮箱
  if (!account?.passwordHash || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
    return { error: "邮箱或密码不正确" };
  }

  await writeSession(account.id, "USER");
  redirect(account.profile?.completedAt ? "/home" : "/onboarding");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
