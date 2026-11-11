"use client";

import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-brand";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          nickname: form.get("nickname"),
        }),
      });
      const data = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        setError(data.error ?? "提交失败，请重试");
        return;
      }
      router.replace(data.next ?? "/home");
      router.refresh();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 w-fit">
        <BrandLockup />
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">创建账号</h1>
      <p className="mt-1.5 text-sm text-ink-2">
        注册后训练记录跟着账号走，换台设备也能看到。
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="nickname" className="text-[13px] font-medium text-ink-2">
            昵称
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            required
            maxLength={20}
            placeholder="怎么称呼你"
            className={inputClass}
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="至少 8 位，含字母和数字"
            className={inputClass}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          注册并开始
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        已经有账号？
        <Link href="/login" className="ml-1 font-medium text-brand hover:underline">
          直接登录
        </Link>
      </p>
    </div>
  );
}
