import { COOKIE_MAX_AGE, SESSION_COOKIE } from "@/lib/cookies";
import { createToken } from "@/lib/session";
import { nowMs } from "@/lib/date";

/**
 * 会话 cookie 的属性。
 * 为什么走 Route Handler 而不是 Server Action：
 * action 的响应在「重渲染」阶段一旦出错（例如 layout 抛重定向），
 * Set-Cookie 会连同 action 结果一起被丢弃，表现为「注册成功却停在原页、会话没写入」。
 * Route Handler 直接返回 NextResponse，不受这条链路影响。
 */
export function sessionCookie(accountId: string) {
  const token = createToken({
    accountId,
    type: "USER",
    exp: nowMs() + COOKIE_MAX_AGE * 1000,
  });

  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export const clearedSessionCookie = {
  name: SESSION_COOKIE,
  value: "",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};
