"use client";

/**
 * 画出来的对勾。
 * 用 pathLength=1 把路径长度归一化，stroke-dashoffset 从 1 走到 0 就是“从左下画到右上”，
 * 不需要 getTotalLength()，避免测量抖动和在 SSR 下拿到 0。
 */
export function CheckDraw({
  className = "size-4",
  strokeWidth = 3,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="check-path" d="M5 13l4 4L19 7" pathLength={1} />
    </svg>
  );
}
