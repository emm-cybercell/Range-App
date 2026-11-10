import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { calcMetabolic, type Goal, type Sex } from "@/lib/metabolic";
import { parseDate, todayString } from "@/lib/date";
import { NutritionClient, type MealGroup } from "./nutrition-client";

const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const account = await requireAccount();
  if (!account) return null;

  const sp = await searchParams;
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : todayString();
  const date = parseDate(dateKey);

  const [profile, entries, water] = await Promise.all([
    prisma.profile.findUnique({ where: { accountId: account.id } }),
    prisma.mealEntry.findMany({
      where: { accountId: account.id, date },
      orderBy: { createdAt: "asc" },
    }),
    prisma.waterLog.findUnique({
      where: { accountId_date: { accountId: account.id, date } },
    }),
  ]);

  const derived =
    profile?.sex && profile.age && profile.heightCm && profile.weightKg && profile.goal && profile.daysPerWeek
      ? calcMetabolic({
          sex: profile.sex as Sex,
          age: profile.age,
          heightCm: Number(profile.heightCm),
          weightKg: Number(profile.weightKg),
          goal: profile.goal as Goal,
          daysPerWeek: profile.daysPerWeek,
        })
      : null;

  const targets = {
    kcal: profile?.targetKcalOverride ?? derived?.targetKcal ?? 2000,
    protein: Number(profile?.targetProteinOverride ?? derived?.targetProtein ?? 120),
    carbs: Number(profile?.targetCarbsOverride ?? derived?.targetCarbs ?? 240),
    fat: Number(profile?.targetFatOverride ?? derived?.targetFat ?? 60),
    waterMl: profile?.waterTargetMlOverride ?? derived?.targetWaterMl ?? 2000,
  };

  const meals: MealGroup[] = MEAL_ORDER.map((type) => {
    const list = entries.filter((e) => e.mealType === type);
    return {
      type,
      kcal: list.reduce((sum, e) => sum + e.kcal, 0),
      entries: list.map((e) => ({
        id: e.id,
        name: e.nameSnapshot,
        grams: Number(e.grams),
        kcal: e.kcal,
        protein: Number(e.protein),
        carbs: Number(e.carbs),
        fat: Number(e.fat),
      })),
    };
  });

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + Number(e.protein),
      carbs: acc.carbs + Number(e.carbs),
      fat: acc.fat + Number(e.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <NutritionClient
      dateKey={dateKey}
      isToday={dateKey === todayString()}
      targets={targets}
      totals={{
        kcal: totals.kcal,
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      }}
      meals={meals}
      waterMl={water?.ml ?? 0}
    />
  );
}
