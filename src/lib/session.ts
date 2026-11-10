import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { COOKIE_MAX_AGE, GUEST_COOKIE, SESSION_COOKIE } from "@/lib/cookies";
import { nowMs } from "@/lib/date";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export { SESSION_COOKIE, GUEST_COOKIE };
const MAX_AGE = COOKIE_MAX_AGE;

const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-in-production";
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("生产环境必须配置 SESSION_SECRET");
}

export type SessionPayload = {
  accountId: string;
  type: "USER" | "GUEST";
  exp: number;
};

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (input: string) =>
  Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(data: string) {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export function createToken(payload: SessionPayload) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload.accountId || payload.exp < nowMs()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function readGuestKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

/** 只能在 Server Action / Route Handler 中调用 */
export async function writeSession(accountId: string, type: "USER" | "GUEST") {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken({ accountId, type, exp: nowMs() + MAX_AGE * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function ensureGuestCookie(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const key = randomUUID();
  store.set(GUEST_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return key;
}

/* ─────────────── 密码哈希（scrypt，无第三方依赖） ─────────────── */

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
