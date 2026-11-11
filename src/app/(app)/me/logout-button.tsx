"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

/** 退出登录：走 Route Handler 清 cookie，避免 action 响应链路带来的不确定性 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-line bg-surface text-sm font-medium text-ink-2 transition-colors hover:text-danger disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      退出登录
    </button>
  );
}
