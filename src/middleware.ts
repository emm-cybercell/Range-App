import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MAX_AGE, GUEST_COOKIE, SESSION_COOKIE } from "@/lib/cookies";

/**
 * 首次访问时下发一个游客标识，让游客也能建档、训练。
 * 这里不碰数据库（edge runtime 无 Prisma），Account 行由服务端惰性创建。
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  const hasGuest = request.cookies.has(GUEST_COOKIE);

  if (!hasSession && !hasGuest) {
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
