import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import { sessionCookie } from "@/lib/auth-http";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "输入有误" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { email: parsed.data.email, deletedAt: null },
    select: { id: true, passwordHash: true, profile: { select: { completedAt: true } } },
  });

  // 邮箱不存在与密码错误返回同一句，避免探测已注册邮箱
  if (!account?.passwordHash || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    next: account.profile?.completedAt ? "/home" : "/onboarding",
  });
  response.cookies.set(sessionCookie(account.id));
  return response;
}
