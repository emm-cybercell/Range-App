"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * 主题开关。
 * 外观全部由 CSS 的 dark: 变体驱动，JS 只在挂载后补 aria-checked，
 * 这样首屏不会闪、也不会出现 hydration 不一致。
 */
export function ThemeToggle() {
  // DOM 才是主题的真实来源，用外部存储订阅它，避免 effect 里补状态
  const dark = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("themechange", onChange);
      return () => window.removeEventListener("themechange", onChange);
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    // 触发订阅者重新读取（无参数的 store，手动通知）
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="切换深浅色"
      data-no-press
      className="group relative h-8 w-14 shrink-0 rounded-full border border-line bg-sunken"
    >
      <span
        className="switch-thumb absolute top-0.5 left-0.5 grid size-6 place-items-center rounded-full bg-surface text-ink-2 shadow-sm group-active:w-8 dark:left-[30px] dark:group-active:left-[22px]"
        aria-hidden="true"
      >
        <Sun className="size-3.5 dark:hidden" />
        <Moon className="hidden size-3.5 dark:block" />
      </span>
    </button>
  );
}
