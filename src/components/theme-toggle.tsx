"use client";

import { Moon, Sun } from "lucide-react";

/**
 * 主题只由 <html class="dark"> 驱动，图标交给 CSS 决定显示哪一个。
 * 组件本身无状态，既不会首帧闪烁，也不会 hydration 不一致。
 */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换深浅色"
      className="grid size-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:text-ink"
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}
