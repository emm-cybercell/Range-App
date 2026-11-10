"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toggleFavorite } from "../favorite-actions";

const PARTICLES = Array.from({ length: 8 }, (_, i) => i * 45);

/**
 * 收藏按钮。只有「收藏成功」这一下才炸，取消不炸——
 * 每次点击都放烟花会让反馈失去意义。
 */
export function FavoriteButton({
  exerciseId,
  initialFavorited,
}: {
  exerciseId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [burst, setBurst] = useState(false);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await toggleFavorite(exerciseId);
      if (!result.ok) return;
      setFavorited(result.favorited);
      if (result.favorited) {
        setBurst(true);
        window.setTimeout(() => setBurst(false), 700);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      data-ripple
      aria-pressed={favorited}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-btn border px-3 text-[13px] font-medium transition-colors ${
        favorited
          ? "border-brand/40 bg-brand-soft text-brand"
          : "border-line text-ink-2 hover:text-ink"
      }`}
    >
      <span className={`relative grid place-items-center ${burst ? "icon-pop text-brand" : ""}`}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Heart className="size-4" fill={favorited ? "currentColor" : "none"} strokeWidth={2} />
        )}
        {burst
          ? PARTICLES.map((angle) => (
              <span
                key={angle}
                className="burst-dot"
                style={{ "--a": `${angle}deg` } as React.CSSProperties}
              />
            ))
          : null}
      </span>
      {favorited ? "已收藏" : "收藏"}
    </button>
  );
}
