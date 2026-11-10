"use client";

import { useState, type ReactNode } from "react";

/**
 * 移动端筛选面板。
 * 三线图标展开时：上下两条旋转交叉、中间淡出，即「汉堡变叉」。
 * 桌面端不显示这个开关，内容直接铺开。
 */
export function FilterPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-no-press
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-btn border border-line px-3 text-[13px] font-medium text-ink-2 sm:hidden"
      >
        <span className="relative grid size-4 place-items-center" aria-hidden="true">
          <span
            className={`absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-200 ease-[var(--ease-back)] ${
              open ? "rotate-45" : "-translate-y-[5px]"
            }`}
          />
          <span
            className={`absolute h-[1.5px] w-4 rounded-full bg-current transition-opacity duration-150 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-200 ease-[var(--ease-back)] ${
              open ? "-rotate-45" : "translate-y-[5px]"
            }`}
          />
        </span>
        {open ? "收起" : "筛选"}
      </button>

      <div className={`${open ? "block" : "hidden"} sm:block`}>{children}</div>
    </div>
  );
}
