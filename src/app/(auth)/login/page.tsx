"use client";

import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "../actions";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-brand";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 w-fit">
        <BrandLockup />
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">欢迎回来</h1>
      <p className="mt-1.5 text-sm text-ink-2">登录后你的训练记录会在所有设备上同步。</p>

      <form action={action} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-[13px] font-medium text-ink-2">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-[13px] font-medium text-ink-2">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {state?.error ? (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          登录
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        还没有账号？
        <Link href="/register" className="ml-1 font-medium text-brand hover:underline">
          用邮箱注册
        </Link>
      </p>

      <Link href="/onboarding" className="mt-3 text-center text-[13px] text-ink-3 hover:text-ink-2">
        先不登录，直接开始训练
      </Link>
    </div>
  );
}
