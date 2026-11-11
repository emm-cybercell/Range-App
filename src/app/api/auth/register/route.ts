import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { migrateGuestData } from "@/lib/account";
import { readGuestKey } from "@/lib/session";
import { hashPassword } from "@/lib/session";
import { registerSchema } from "@/lib/validators";
import { sessionCookie } from "@/lib/auth-http";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "输入有误" }, { status: 400 });
  }

  const { email, password, nickname } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "这个邮箱已经注册过了，直接登录？" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const account = await prisma.account.create({
    data: { type: "USER", email, passwordHash, nickname, setting: { create: {} } },
    select: { id: true },
  });

  // 游客时代的数据整体迁到新账号，别让用户觉得记录丢了
  const guestId = await readGuestKey();
  if (guestId) {
    try {
      await migrateGuestData(guestId, account.id);
    } catch {
      // 迁移失败不阻断注册
    }
  }

  const response = NextResponse.json({ ok: true, next: "/onboarding" });
  response.cookies.set(sessionCookie(account.id));
  return response;
}
