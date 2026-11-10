"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { clearMealHistory, clearWorkoutHistory } from "./actions";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "theme";
const THEME_EVENT = "theme-change";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function SettingsClient() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "system" as Theme);

  function pick(next: Theme) {
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <div className="flex gap-2">
      {THEMES.map((item) => {
        const active = theme === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => pick(item.value)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-[12px] transition-colors ${
              active
                ? "border-brand bg-brand-soft font-medium text-brand"
                : "border-line text-ink-2 hover:border-ink-3/40"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function DangerZone() {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"workouts" | "meals" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function run(kind: "workouts" | "meals") {
    setBusy(true);
    const result = kind === "workouts" ? await clearWorkoutHistory() : await clearMealHistory();
    setBusy(false);
    setConfirming(null);

    if (!result.ok) return;
    setDone(kind === "workouts" ? "训练记录已清空" : "饮食记录已清空");
    router.refresh();
  }

  const items = [
    { kind: "workouts" as const, label: "清空训练记录", hint: "计划会保留" },
    { kind: "meals" as const, label: "清空饮食记录", hint: "包括饮水记录" },
  ];

  return (
    <div className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.kind} className="py-3">
          {confirming === item.kind ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[12px] text-ink-2">确定要{item.label}吗？不可恢复。</span>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-btn border border-line px-3 py-1.5 text-[12px] text-ink-2"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => run(item.kind)}
                disabled={busy}
                className="flex items-center gap-1 rounded-btn bg-danger px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-3 animate-spin" /> : null}
                确认清空
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(item.kind)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm">{item.label}</span>
              <span className="text-[11px] text-ink-3">{item.hint}</span>
            </button>
          )}
        </div>
      ))}

      {done ? (
        <p className="flex items-center gap-1.5 py-2.5 text-[11px] text-brand">
          <Check className="size-3" />
          {done}
        </p>
      ) : null}
    </div>
  );
}
