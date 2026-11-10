"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";
import { parseDate } from "@/lib/date";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
type MealTypeValue = (typeof MEAL_TYPES)[number];

const asMeal = (value: string): MealTypeValue =>
  (MEAL_TYPES as readonly string[]).includes(value) ? (value as MealTypeValue) : "SNACK";

const round1 = (n: number) => Math.round(n * 10) / 10;

export type FoodHit = {
  id: string;
  name: string;
  category: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingName: string | null;
  servingGrams: number | null;
  isMine: boolean;
};

/** 食物搜索：内置库 + 自己的自定义食物，中文名与拼音都能匹配 */
export async function searchFoods(query: string): Promise<FoodHit[]> {
  const account = await getCurrentAccount();
  const q = query.trim();
  if (!account || q.length < 1) return [];

  const foods = await prisma.food.findMany({
    where: {
      active: true,
      OR: [{ accountId: null }, { accountId: account.id }],
      AND: [
        {
          OR: [
            { name: { contains: q } },
            { pinyin: { contains: q.toLowerCase() } },
            { category: { contains: q } },
          ],
        },
      ],
    },
    orderBy: [{ accountId: "desc" }, { name: "asc" }],
    take: 20,
  });

  return foods.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    kcalPer100g: f.kcalPer100g,
    proteinPer100g: Number(f.proteinPer100g),
    carbsPer100g: Number(f.carbsPer100g),
    fatPer100g: Number(f.fatPer100g),
    servingName: f.servingName,
    servingGrams: f.servingGrams,
    isMine: f.accountId !== null,
  }));
}

export async function addFoodEntry(input: {
  foodId: string;
  date: string;
  mealType: string;
  grams: number;
}) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const grams = Math.min(2000, Math.max(1, Math.round(input.grams)));
  const food = await prisma.food.findFirst({
    where: { id: input.foodId, OR: [{ accountId: null }, { accountId: account.id }] },
  });
  if (!food) return { ok: false as const, message: "找不到这个食物" };

  const ratio = grams / 100;

  await prisma.mealEntry.create({
    data: {
      accountId: account.id,
      foodId: food.id,
      nameSnapshot: food.name,
      grams,
      kcal: Math.round(food.kcalPer100g * ratio),
      protein: round1(Number(food.proteinPer100g) * ratio),
      carbs: round1(Number(food.carbsPer100g) * ratio),
      fat: round1(Number(food.fatPer100g) * ratio),
      date: parseDate(input.date),
      mealType: asMeal(input.mealType),
    },
  });

  revalidatePath("/nutrition");
  return { ok: true as const };
}

/** 手动记录：不在食物库里的东西，直接填这一份的营养 */
export async function addManualEntry(input: {
  date: string;
  mealType: string;
  name: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  grams?: number;
}) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const name = input.name.trim();
  if (!name) return { ok: false as const, message: "写一下吃了什么" };
  if (!Number.isFinite(input.kcal) || input.kcal <= 0) {
    return { ok: false as const, message: "热量需要大于 0" };
  }

  await prisma.mealEntry.create({
    data: {
      accountId: account.id,
      nameSnapshot: name.slice(0, 40),
      grams: Math.min(2000, Math.max(1, Math.round(input.grams ?? 100))),
      kcal: Math.round(input.kcal),
      protein: round1(input.protein ?? 0),
      carbs: round1(input.carbs ?? 0),
      fat: round1(input.fat ?? 0),
      date: parseDate(input.date),
      mealType: asMeal(input.mealType),
    },
  });

  revalidatePath("/nutrition");
  return { ok: true as const };
}

export async function deleteFoodEntry(entryId: string) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  await prisma.mealEntry.deleteMany({ where: { id: entryId, accountId: account.id } });
  revalidatePath("/nutrition");
  return { ok: true as const };
}

export async function addWater(input: { date: string; delta: number }) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const date = parseDate(input.date);
  const existing = await prisma.waterLog.findUnique({
    where: { accountId_date: { accountId: account.id, date } },
  });

  const next = Math.max(0, Math.min(6000, (existing?.ml ?? 0) + Math.round(input.delta)));

  await prisma.waterLog.upsert({
    where: { accountId_date: { accountId: account.id, date } },
    create: { accountId: account.id, date, ml: next },
    update: { ml: next },
  });

  revalidatePath("/nutrition");
  return { ok: true as const, ml: next };
}

/** 滑块用：直接设成某个绝对值，而不是加减 */
export async function setWaterAmount(input: { date: string; ml: number }) {
  const account = await getCurrentAccount();
  if (!account) return { ok: false as const, message: "会话已失效，请刷新页面" };

  const date = parseDate(input.date);
  const ml = Math.max(0, Math.min(6000, Math.round(input.ml)));

  await prisma.waterLog.upsert({
    where: { accountId_date: { accountId: account.id, date } },
    create: { accountId: account.id, date, ml },
    update: { ml },
  });

  revalidatePath("/nutrition");
  return { ok: true as const, ml };
}
