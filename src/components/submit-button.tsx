"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 表单提交按钮。
 *
 * 为什么需要它：服务端动作要走一次数据库往返，网络慢时要等好几秒。
 * 原生按钮在这段时间里没有任何变化，用户会以为"点了没反应"，于是反复点击。
 * useFormStatus 能读到所在 form 的提交状态，提交中禁用按钮并显示进度。
 */
export function SubmitButton({
  children,
  pendingText = "处理中…",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-ripple
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
