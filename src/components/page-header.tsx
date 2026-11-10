import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  /** 标题下方的一行说明，可以是纯文本或节点 */
  subtitle?: ReactNode;
  /** 传了才渲染返回入口；一级页面不传 */
  back?: { href: string; label: string };
  /** 右侧动作区：主题切换、更换、新建等 */
  actions?: ReactNode;
  className?: string;
};

/**
 * 统一页面标题栏。
 * 返回入口的样式集中在这里，避免每个页面各写一套导致视觉漂移。
 */
export function PageHeader({ title, subtitle, back, actions, className = "" }: Props) {
  return (
    <header className={className}>
      {back ? (
        <Link
          href={back.href}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          {back.label}
        </Link>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <div className="mt-1 text-sm text-ink-2">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** 与 PageHeader 等高的骨架，用于标题依赖数据的页面，避免布局跳动 */
export function PageHeaderSkeleton({ back = false }: { back?: boolean }) {
  return (
    <div>
      {back ? <div className="mb-4 h-4 w-16 skeleton rounded" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-7 w-40 skeleton rounded" />
          <div className="mt-2 h-4 w-56 skeleton rounded" />
        </div>
      </div>
    </div>
  );
}
