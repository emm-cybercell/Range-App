"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 表单提交按钮。
 *
 * 为什么需要它：服务端动作要走一次数据库往返，跨境部署时要等好几秒。
 * 原生按钮在这段时间里没有任何变化，用户会以为"点了没反应"，于是反复点击。
 * useFormStatus 能读到所在 form 的提交状态，提交中禁用按钮并显示进度。
 */
export function SubmitButton({
  children,
  pendingText = "处理中…",
  pendingNode,
  ariaLabel,
  className = "",
}: {
  children: ReactNode;
  /** 提交中显示的文案，默认「处理中…」 */
  pendingText?: string;
  /** 提交中显示的节点。给了就用它替代默认的「转圈 + 文案」，适合纯图标按钮 */
  pendingNode?: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      data-ripple
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        pendingNode ?? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {pendingText}
          </>
        )
      ) : (
        children
      )}
    </button>
  );
}
