export type Sex = "MALE" | "FEMALE";
export type Goal = "MUSCLE_GAIN" | "FAT_LOSS" | "SHAPING" | "STRENGTH" | "MAINTAIN";

export type MetabolicInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  daysPerWeek: number;
};

export type MetabolicResult = {
  bmi: number;
  bmr: number;
  tdee: number;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetWaterMl: number;
};

const ACTIVITY_FACTOR: Record<number, number> = {
  2: 1.375,
  3: 1.462,
  4: 1.55,
  5: 1.638,
  6: 1.725,
};

const KCAL_DELTA: Record<Goal, number> = {
  MUSCLE_GAIN: 300,
  FAT_LOSS: -400,
  SHAPING: 0,
  STRENGTH: 150,
  MAINTAIN: 0,
};

const PROTEIN_PER_KG: Record<Goal, number> = {
  MUSCLE_GAIN: 2.0,
  FAT_LOSS: 2.2,
  SHAPING: 1.6,
  STRENGTH: 2.0,
  MAINTAIN: 1.6,
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 配方见 docs/01-PRD.md § F3，前端与服务端共用这一份，禁止各写一套 */
export function calcMetabolic(input: MetabolicInput): MetabolicResult {
  const { sex, age, heightCm, weightKg, goal, daysPerWeek } = input;

  const bmrMale = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const bmr = sex === "MALE" ? bmrMale : bmrMale - 166;

  const factor = ACTIVITY_FACTOR[daysPerWeek] ?? 1.55;
  const tdee = bmr * factor;

  const rawKcal = tdee + KCAL_DELTA[goal];
  const targetKcal = Math.round(rawKcal / 10) * 10;

  const targetProtein = round1(weightKg * PROTEIN_PER_KG[goal]);
  const targetFat = round1((targetKcal * 0.25) / 9);
  const targetCarbs = Math.max(
    0,
    round1((targetKcal - targetProtein * 4 - targetFat * 9) / 4),
  );

  const heightM = heightCm / 100;
  const bmi = round1(weightKg / (heightM * heightM));

  return {
    bmi,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal,
    targetProtein,
    targetCarbs,
    targetFat,
    targetWaterMl: Math.round((weightKg * 35) / 50) * 50,
  };
}

export const GOAL_LABEL: Record<Goal, string> = {
  MUSCLE_GAIN: "增肌",
  FAT_LOSS: "减脂",
  SHAPING: "塑形",
  STRENGTH: "力量",
  MAINTAIN: "保持",
};
