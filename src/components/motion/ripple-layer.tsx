"use client";

import { useEffect } from "react";

/**
 * 全局波纹层。
 *
 * 为什么要放在根布局统一监听，而不是给每个按钮包一层组件：
 * 项目里绝大多数按钮都在 Server Component 里，逐个改造会把整页变成客户端组件。
 * 这里只认 `[data-ripple]` 标记，事件委托到 document，按钮本身零改动。
 */
export function RippleLayer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const host = target.closest("[data-ripple]");
      if (!(host instanceof HTMLElement)) return;
      if (host.hasAttribute("disabled") || host.getAttribute("aria-disabled") === "true") return;

      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // 连点时先把上一个收掉，避免波纹叠成一团
      host.querySelectorAll(".ripple-dot").forEach((dot) => dot.remove());

      const size = Math.max(rect.width, rect.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "ripple-dot";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${event.clientX - rect.left}px`;
      dot.style.top = `${event.clientY - rect.top}px`;

      host.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      // 兜底：动画被中断（切页、隐藏）时也能清理
      window.setTimeout(() => dot.remove(), 800);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return null;
}
