/**
 * 品牌标识：哑铃横杆 + 抬升的轨迹，寓意「练」与「进步」。
 * 纯 SVG，任意尺寸清晰，颜色跟随主题变量。
 */
export function BrandGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* 杠铃片 */}
      <rect x="6" y="24" width="5" height="16" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="14" y="18" width="8" height="28" rx="3" fill="currentColor" />
      <rect x="42" y="18" width="8" height="28" rx="3" fill="currentColor" />
      <rect x="53" y="24" width="5" height="16" rx="2" fill="currentColor" opacity="0.55" />
      {/* 横杆 */}
      <rect x="22" y="30" width="20" height="4" rx="2" fill="currentColor" />
      {/* 上升轨迹 */}
      <path
        d="M24 46 L34 38 L42 43 L54 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="54" cy="30" r="4" fill="currentColor" />
    </svg>
  );
}

/** 方形应用图标：用于页头、登录页、应用内导航 */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] text-white ${className}`}
      style={{
        backgroundImage: "linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)",
      }}
    >
      <BrandGlyph className="size-[62%]" />
    </span>
  );
}

/** 图标 + 中文字标的组合 */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <BrandMark />
      <span className="text-[17px] font-semibold tracking-tight">练迹</span>
    </span>
  );
}
