"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 数字滚动。
 *
 * 两个关键约束：
 * 1. 首帧必须直接渲染终值——服务端渲染与首次水合不能出现两个不同数字；
 *    只有 props 变化时才启动补间，所以首屏不会“从 0 数上来”。
 * 2. 用 easeOutExpo 收尾（1 - 2^(-10t)），接近目标值时自然减速，不会像急刹车。
 */
export function AnimatedNumber({
  value,
  duration = 520,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = fromRef.current;
    if (reduce || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const diff = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * t);
      setDisplay(from + diff * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        setDisplay(value);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = display;
    };
    // display 只作为清理时的快照，不参与依赖，避免每帧重启动画
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rounded = Math.round(display);
  return (
    <span className={className}>{format ? format(rounded) : rounded.toLocaleString()}</span>
  );
}
