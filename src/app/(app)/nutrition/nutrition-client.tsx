"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Droplets, Loader2, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { addFoodEntry, addManualEntry, addWater, deleteFoodEntry, searchFoods, type FoodHit } from "./actions";

export type MealEntryView = {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealGroup = {
  type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  kcal: number;
  entries: MealEntryView[];
};

type Targets = { kcal: number; protein: number; carbs: number; fat: number; waterMl: number };
type Totals = { kcal: number; protein: number; carbs: number; fat: number };

const MEAL_LABEL: Record<MealGroup["type"], string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

function shiftDate(dateKey: string, delta: number) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ringOffset(percent: number) {
  const circumference = 2 * Math.PI * 42;
  return circumference * (1 - Math.min(1, Math.max(0, percent)));
}

export function NutritionClient({
  dateKey,
  isToday,
  targets,
  totals,
  meals,
  waterMl,
}: {
  dateKey: string;
  isToday: boolean;
  targets: Targets;
  totals: Totals;
  meals: MealGroup[];
  waterMl: number;
}) {
  const router = useRouter();

  const [sheet, setSheet] = useState<{ open: boolean; meal: MealGroup["type"]; mode: "search" | "manual" }>({
    open: false,
    meal: "BREAKFAST",
    mode: "search",
  });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState("100");
  const [manual, setManual] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // 输入停顿后再查，避免每敲一个字就打一次数据库
  useEffect(() => {
    if (!sheet.open || sheet.mode !== "search") return;
    const q = query.trim();
    if (q.length === 0) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchFoods(q);
      setHits(result);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, sheet.open, sheet.mode]);

  const remaining = targets.kcal - totals.kcal;
  const percent = totals.kcal / Math.max(targets.kcal, 1);

  const macros = useMemo(
    () => [
      { key: "protein", label: "蛋白", value: totals.protein, target: targets.protein },
      { key: "carbs", label: "碳水", value: totals.carbs, target: targets.carbs },
      { key: "fat", label: "脂肪", value: totals.fat, target: targets.fat },
    ],
    [totals, targets],
  );

  const pickedPreview = useMemo(() => {
    if (!picked) return null;
    const g = Math.max(0, Number(grams) || 0);
    const ratio = g / 100;
    return {
      kcal: Math.round(picked.kcalPer100g * ratio),
      protein: Math.round(picked.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(picked.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(picked.fatPer100g * ratio * 10) / 10,
    };
  }, [picked, grams]);

  function openSheet(meal: MealGroup["type"]) {
    setSheet({ open: true, meal, mode: "search" });
    setQuery("");
    setHits([]);
    setPicked(null);
    setGrams("100");
    setManual({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  }

  function closeSheet() {
    setSheet((s) => ({ ...s, open: false }));
  }

  async function confirmFood() {
    if (!picked) return;
    setBusy(true);
    const result = await addFoodEntry({
      foodId: picked.id,
      date: dateKey,
      mealType: sheet.meal,
      grams: Number(grams) || 100,
    });
    setBusy(false);
    if (!result.ok) {
      setToast(result.message);
      return;
    }
    closeSheet();
    router.refresh();
  }

  async function confirmManual() {
    setBusy(true);
    const result = await addManualEntry({
      date: dateKey,
      mealType: sheet.meal,
      name: manual.name,
      kcal: Number(manual.kcal),
      protein: Number(manual.protein) || 0,
      carbs: Number(manual.carbs) || 0,
      fat: Number(manual.fat) || 0,
    });
    setBusy(false);
    if (!result.ok) {
      setToast(result.message);
      return;
    }
    closeSheet();
    router.refresh();
  }

  async function removeEntry(id: string) {
    const result = await deleteFoodEntry(id);
    if (!result.ok) {
      setToast(result.message);
      return;
    }
    router.refresh();
  }

  async function changeWater(delta: number) {
    const result = await addWater({ date: dateKey, delta });
    if (!result.ok) setToast(result.message);
    else router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">饮食</h1>
          <div className="mt-1 flex items-center gap-1 text-[13px] text-ink-2">
            <Link
              href={`/nutrition?date=${shiftDate(dateKey, -1)}`}
              className="grid size-6 place-items-center rounded-full hover:bg-sunken"
              aria-label="前一天"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="num min-w-[92px] text-center">{dateKey}</span>
            {isToday ? (
              <span className="grid size-6 place-items-center rounded-full text-ink-3">
                <ChevronRight className="size-4" />
              </span>
            ) : (
              <Link
                href={`/nutrition?date=${shiftDate(dateKey, 1)}`}
                className="grid size-6 place-items-center rounded-full hover:bg-sunken"
                aria-label="后一天"
              >
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 热量总览 */}
      <section className="mt-4 rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-5">
          <div className="relative grid size-28 shrink-0 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--sunken)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={percent > 1 ? "var(--warn)" : "var(--brand)"}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={ringOffset(percent)}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="text-center">
              <p className="num text-xl font-bold leading-6">{totals.kcal}</p>
              <p className="text-[10px] text-ink-3">/ {targets.kcal}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-2">
              {remaining >= 0 ? (
                <>
                  还能吃 <span className="num font-semibold text-ink">{remaining}</span> kcal
                </>
              ) : (
                <>
                  超出 <span className="num font-semibold text-warn">{Math.abs(remaining)}</span> kcal
                </>
              )}
            </p>

            <div className="mt-3 space-y-2">
              {macros.map((m) => {
                const pct = Math.min(100, Math.round((m.value / Math.max(m.target, 1)) * 100));
                return (
                  <div key={m.key}>
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-ink-2">{m.label}</span>
                      <span className="num text-ink-3">
                        {m.value} / {Math.round(m.target)} g
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 饮水 */}
      <section className="mt-3 flex items-center gap-3 rounded-card border border-line bg-surface px-5 py-3.5">
        <Droplets className="size-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="num text-[13px] font-medium">
            {waterMl} <span className="text-[11px] font-normal text-ink-3">/ {targets.waterMl} ml</span>
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, (waterMl / Math.max(targets.waterMl, 1)) * 100)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => changeWater(-250)}
          aria-label="减少 250 毫升"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink-3"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => changeWater(250)}
          aria-label="增加 250 毫升"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
        >
          <Plus className="size-3.5" />
        </button>
      </section>

      {/* 四餐 */}
      <div className="mt-4 space-y-3">
        {meals.map((meal) => (
          <section key={meal.type} className="rounded-card border border-line bg-surface">
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="text-sm font-semibold">
                {MEAL_LABEL[meal.type]}
                {meal.kcal > 0 ? (
                  <span className="num ml-2 text-[11px] font-normal text-ink-3">{meal.kcal} kcal</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => openSheet(meal.type)}
                className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand"
              >
                <Plus className="size-3" />
                添加
              </button>
            </div>

            {meal.entries.length > 0 ? (
              <ul className="mt-2 mb-3 divide-y divide-line px-5">
                {meal.entries.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{entry.name}</p>
                      <p className="num text-[11px] text-ink-3">
                        {entry.grams} g · 蛋白 {entry.protein} · 碳水 {entry.carbs} · 脂肪 {entry.fat}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[13px] font-medium">{entry.kcal}</span>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      aria-label="删除这条记录"
                      className="grid size-7 place-items-center rounded-full text-ink-3 hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pt-2 pb-4 text-[12px] text-ink-3">还没记录</p>
            )}
          </section>
        ))}
      </div>

      {/* 添加浮层 */}
      {sheet.open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center">
          <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-surface p-5 sm:rounded-card">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">
                添加到{MEAL_LABEL[sheet.meal]}
              </p>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="关闭"
                className="grid size-8 place-items-center rounded-full text-ink-3"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex gap-1 rounded-full bg-sunken p-1">
              {(
                [
                  ["search", "搜食物"],
                  ["manual", "手动记"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSheet((s) => ({ ...s, mode }))}
                  className={`flex-1 rounded-full py-1.5 text-[13px] font-medium transition-colors ${
                    sheet.mode === mode ? "bg-surface text-ink shadow-sm" : "text-ink-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {sheet.mode === "search" ? (
              <>
                <div className="relative mt-4">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="米饭、鸡胸肉、naicha…"
                    className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-brand"
                  />
                </div>

                {picked ? (
                  <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/40 p-4">
                    <p className="text-sm font-semibold">{picked.name}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={grams}
                        onChange={(e) => setGrams(e.target.value)}
                        className="num h-10 w-24 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand"
                      />
                      <span className="text-xs text-ink-2">克</span>
                      {picked.servingGrams ? (
                        <button
                          type="button"
                          onClick={() => setGrams(String(picked.servingGrams))}
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-2"
                        >
                          {picked.servingName}（{picked.servingGrams}g）
                        </button>
                      ) : null}
                    </div>
                    {pickedPreview ? (
                      <p className="num mt-2 text-[11px] text-ink-2">
                        {pickedPreview.kcal} kcal · 蛋白 {pickedPreview.protein} · 碳水{" "}
                        {pickedPreview.carbs} · 脂肪 {pickedPreview.fat}
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPicked(null)}
                        className="h-10 rounded-btn border border-line px-4 text-[13px] text-ink-2"
                      >
                        重选
                      </button>
                      <button
                        type="button"
                        onClick={confirmFood}
                        disabled={busy}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-btn bg-brand text-[13px] font-semibold text-white disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        记下
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {searching ? (
                      <p className="py-6 text-center text-[12px] text-ink-3">搜索中…</p>
                    ) : hits.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {hits.map((food) => (
                          <li key={food.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPicked(food);
                                setGrams(String(food.servingGrams ?? 100));
                              }}
                              className="flex w-full items-center gap-3 py-2.5 text-left"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">{food.name}</span>
                                <span className="block text-[11px] text-ink-3">
                                  {food.category ?? "食物"} · 每 100g {food.kcalPer100g} kcal
                                </span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-ink-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : query.trim() ? (
                      <p className="py-6 text-center text-[12px] text-ink-3">
                        没找到，切到「手动记」
                      </p>
                    ) : (
                      <p className="py-6 text-center text-[12px] text-ink-3">
                        输入食物名、分类或拼音搜索
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 space-y-2.5">
                <input
                  value={manual.name}
                  onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                  placeholder="吃了什么"
                  className="h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ["kcal", "热量 kcal"],
                      ["protein", "蛋白 g"],
                      ["carbs", "碳水 g"],
                      ["fat", "脂肪 g"],
                    ] as const
                  ).map(([key, label]) => (
                    <input
                      key={key}
                      type="number"
                      inputMode="decimal"
                      value={manual[key]}
                      onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))}
                      placeholder={label}
                      className="num h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={confirmManual}
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-brand text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  记下
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs text-canvas shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
