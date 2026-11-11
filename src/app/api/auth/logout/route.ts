import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/auth-http";

export async function POST() {
  const response = NextResponse.json({ ok: true, next: "/" });
  response.cookies.set(clearedSessionCookie);
  return response;
}
