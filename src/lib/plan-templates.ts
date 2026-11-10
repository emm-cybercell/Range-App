import templatesJson from "../../prisma/seed/plan-templates.json";

export type UserEquipment = "GYM" | "DUMBBELL" | "BODYWEIGHT";
export type ExerciseEquipment = "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT";

export type TemplateExercise = {
  slug: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
};

export type TemplateDay = { name: string; exercises: TemplateExercise[] };

export type PlanTemplate = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  minDaysPerWeek: number;
  maxDaysPerWeek: number;
  requiresEquipment: UserEquipment;
  days: TemplateDay[];
};

export const TEMPLATES = templatesJson as PlanTemplate[];

/** 用户器械条件 → 能做的动作器械 */
const ALLOWED_EQUIPMENT: Record<UserEquipment, ExerciseEquipment[]> = {
  GYM: ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT"],
  DUMBBELL: ["DUMBBELL", "BODYWEIGHT"],
  BODYWEIGHT: ["BODYWEIGHT"],
};

export function canDoExercise(user: UserEquipment, required: ExerciseEquipment) {
  return ALLOWED_EQUIPMENT[user].includes(required);
}

/** 模板是否与用户器械条件兼容（模板级别的要求，比单个动作宽松） */
export function isTemplateCompatible(user: UserEquipment, template: PlanTemplate) {
  const order: UserEquipment[] = ["BODYWEIGHT", "DUMBBELL", "GYM"];
  return order.indexOf(user) >= order.indexOf(template.requiresEquipment);
}

/** 用户每周能练几天 → 排哪几个星期（ISO 1=周一） */
const WEEKDAY_PATTERN: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

export function weekdaysFor(daysPerWeek: number): number[] {
  return WEEKDAY_PATTERN[daysPerWeek] ?? WEEKDAY_PATTERN[4];
}

export const WEEKDAY_LABEL = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 按星期几排课：模板天数少于用户可练天数时循环补齐（如 PPL 一周 6 练走两轮） */
export function buildSchedule(template: PlanTemplate, daysPerWeek: number) {
  const weekdays = weekdaysFor(daysPerWeek);
  return weekdays.map((weekday, i) => ({
    weekday,
    day: template.days[i % template.days.length],
    order: i + 1,
  }));
}

/** 估算单次训练时长（分钟）：每组按 40 秒动作 + 组间休息 */
export function estimateMinutes(day: TemplateDay) {
  const seconds = day.exercises.reduce((sum, e) => sum + e.sets * (40 + e.restSec), 0);
  return Math.max(15, Math.round(seconds / 60));
}

type RecommendInput = {
  goal: string | null;
  daysPerWeek: number | null;
  equipment: UserEquipment | null;
  level: string | null;
};

export type TemplateOption = PlanTemplate & {
  compatible: boolean;
  score: number;
  recommended: boolean;
  reason: string;
};

/**
 * 推荐规则见 docs/01-PRD.md § F5。
 * 兼容性和匹配度分开算：不兼容的模板仍然展示，但会标注需要的器械。
 */
export function recommendTemplates(profile: RecommendInput): TemplateOption[] {
  const equipment = profile.equipment ?? "GYM";
  const days = profile.daysPerWeek ?? 4;
  const level = profile.level ?? "BEGINNER";
  const goal = profile.goal ?? "MUSCLE_GAIN";

  const scored = TEMPLATES.map((t) => {
    const compatible = isTemplateCompatible(equipment, t);
    let score = 0;

    if (compatible) score += 50;
    if (days >= t.minDaysPerWeek && days <= t.maxDaysPerWeek) score += 30;
    else score -= Math.min(20, Math.abs(days - t.minDaysPerWeek) * 6);

    if (level === "BEGINNER" && t.slug === "beginner-full-body") score += 25;
    if (level === "BEGINNER" && t.slug === "five-day-split") score -= 15;
    if (level === "ADVANCED" && t.slug === "five-day-split") score += 15;
    if (level === "INTERMEDIATE" && t.slug === "upper-lower") score += 12;
    if (equipment === "BODYWEIGHT" && t.slug === "home-bodyweight") score += 40;
    if (goal === "FAT_LOSS" && (t.slug === "ppl" || t.slug === "upper-lower")) score += 6;
    if (goal === "STRENGTH" && t.slug === "five-day-split") score += 6;

    let reason = `${t.days.length} 个训练日，每周排 ${days} 次`;
    if (!compatible) {
      reason =
        t.requiresEquipment === "GYM"
          ? "需要健身房器械"
          : t.requiresEquipment === "DUMBBELL"
            ? "需要一对哑铃"
            : "徒手即可";
    }

    return { ...t, compatible, score, recommended: false, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((t) => t.compatible).slice(0, 3);
  top.forEach((t) => {
    t.recommended = true;
  });

  return scored;
}
