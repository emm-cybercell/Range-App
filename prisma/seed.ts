import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pinyin } from "pinyin-pro";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未配置");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const dir = join(process.cwd(), "prisma", "seed");
const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), "utf8")) as T;

type MuscleSeed = { slug: string; name: string; bodyPart: string; order: number };

type ExerciseSeed = {
  slug: string;
  name: string;
  nameEn: string;
  pinyin: string;
  bodyPart: string;
  equipment: string;
  level: string;
  kind: string;
  primaryMuscle: string;
  secondary: string[];
  steps: string[];
  tips: string[];
  mistakes: string[];
  alt: string[];
};

type FoodSeed = [string, string, string | null, number, number, number, number, string | null, number | null];

type PlanSeed = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  minDaysPerWeek: number;
  maxDaysPerWeek: number;
  requiresEquipment: string;
  days: { name: string; exercises: { slug: string; sets: number; repsMin: number; repsMax: number; restSec: number }[] }[];
};

async function seedMuscles() {
  const muscles = read<MuscleSeed[]>("muscles.json");
  for (const m of muscles) {
    await prisma.muscle.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, name: m.name, bodyPart: m.bodyPart as never, order: m.order },
      update: { name: m.name, bodyPart: m.bodyPart as never, order: m.order },
    });
  }
  console.log(`  肌肉群 ${muscles.length}`);
  return muscles;
}

async function seedExercises() {
  const exercises = read<ExerciseSeed[]>("exercises.json");
  const muscles = await prisma.muscle.findMany({ select: { id: true, slug: true, name: true } });
  const muscleId = new Map(muscles.map((m) => [m.slug, m.id]));
  const muscleName = new Map(muscles.map((m) => [m.slug, m.name]));

  for (const e of exercises) {
    const primaryMuscleId = muscleId.get(e.primaryMuscle);
    if (!primaryMuscleId) throw new Error(`动作 ${e.slug} 的主肌肉群不存在：${e.primaryMuscle}`);

    // 拼音由中文名生成，避免手写错误；同时生成首字母，支持 glwt 这类首字母搜索
    // 去掉空格与符号，保证 "T 杠划船" 也能被 tghc 命中
    const fullPinyin = pinyin(e.name, { toneType: "none", type: "array" })
      .join("")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const initials = pinyin(e.name, { pattern: "first", toneType: "none", type: "array" })
      .join("")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const data = {
      name: e.name,
      nameEn: e.nameEn,
      pinyin: fullPinyin,
      pinyinInitials: initials,
      bodyPart: e.bodyPart as never,
      equipment: e.equipment as never,
      level: e.level as never,
      kind: e.kind as never,
      primaryMuscleId,
      steps: e.steps,
      tips: e.tips,
      mistakes: e.mistakes,
    };

    const row = await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: { slug: e.slug, ...data },
      update: data,
    });

    // 次要肌肉群：先清后建，保证幂等
    await prisma.exerciseSecondaryMuscle.deleteMany({ where: { exerciseId: row.id } });
    const secondary = e.secondary.map((s) => muscleId.get(s)).filter((id): id is string => Boolean(id));
    if (secondary.length) {
      await prisma.exerciseSecondaryMuscle.createMany({
        data: secondary.map((id) => ({ exerciseId: row.id, muscleId: id })),
      });
    }
  }

  // 替代动作：所有动作落库后统一建立关系
  const all = await prisma.exercise.findMany({ select: { id: true, slug: true } });
  const exId = new Map(all.map((e) => [e.slug, e.id]));
  await prisma.exerciseAlternative.deleteMany({});
  const altRows: { fromId: string; toId: string }[] = [];
  for (const e of exercises) {
    const fromId = exId.get(e.slug);
    if (!fromId) continue;
    for (const a of e.alt) {
      const toId = exId.get(a);
      if (!toId) throw new Error(`动作 ${e.slug} 的替代动作不存在：${a}`);
      altRows.push({ fromId, toId });
    }
  }
  await prisma.exerciseAlternative.createMany({ data: altRows, skipDuplicates: true });

  console.log(`  动作 ${exercises.length}（含 ${altRows.length} 条替代关系，${muscleName.size} 个肌肉群）`);
}

async function seedFoods() {
  const raw = read<unknown[]>("foods.json");
  const foods = raw.filter(Array.isArray) as FoodSeed[];

  for (const f of foods) {
    const [name, pinyin, category, kcal, protein, carbs, fat, servingName, servingGrams] = f;
    const data = {
      pinyin,
      category,
      kcalPer100g: kcal,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      servingName,
      servingGrams,
      source: "BUILTIN" as never,
      accountId: null,
    };
    const existing = await prisma.food.findFirst({ where: { name, accountId: null } });
    if (existing) {
      await prisma.food.update({ where: { id: existing.id }, data });
    } else {
      await prisma.food.create({ data: { name, ...data } });
    }
  }
  console.log(`  食物 ${foods.length}`);
}

async function seedQuotes() {
  const quotes = read<[string, string][]>("quotes.json");
  await prisma.quote.deleteMany({});
  await prisma.quote.createMany({
    data: quotes.map(([text, category], i) => ({
      text,
      category: category as never,
      order: i,
    })),
  });
  console.log(`  标语 ${quotes.length}`);
}

async function validateTemplates() {
  const templates = read<PlanSeed[]>("plan-templates.json");
  const all = await prisma.exercise.findMany({ select: { slug: true } });
  const slugs = new Set(all.map((e) => e.slug));
  const problems: string[] = [];
  for (const t of templates) {
    for (const d of t.days) {
      for (const ex of d.exercises) {
        if (!slugs.has(ex.slug)) problems.push(`${t.slug} / ${d.name} → ${ex.slug}`);
      }
    }
  }
  if (problems.length) throw new Error(`模板引用了不存在的动作：\n${problems.join("\n")}`);
  const dayCount = templates.reduce((n, t) => n + t.days.length, 0);
  console.log(`  计划模板 ${templates.length} 套 / ${dayCount} 个训练日（已校验动作引用）`);
}

async function main() {
  console.log("开始写入种子数据…");
  await seedMuscles();
  await seedExercises();
  await seedFoods();
  await seedQuotes();
  await validateTemplates();
  console.log("种子数据完成 ✅");
}

main()
  .catch((e) => {
    console.error("种子数据失败 ❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
