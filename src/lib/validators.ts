import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "邮箱格式不正确")
  .max(120, "邮箱过长");

const password = z
  .string()
  .min(8, "密码至少 8 位")
  .max(64, "密码最多 64 位")
  .regex(/[A-Za-z]/, "密码需包含字母")
  .regex(/\d/, "密码需包含数字");

export const registerSchema = z.object({
  email,
  password,
  nickname: z.string().trim().min(1, "请填写昵称").max(20, "昵称最多 20 个字"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "请输入密码"),
});

export const onboardingSchema = z.object({
  sex: z.enum(["MALE", "FEMALE"]),
  age: z.coerce.number().int().min(14, "年龄需在 14–80 之间").max(80, "年龄需在 14–80 之间"),
  heightCm: z.coerce.number().min(120, "身高需在 120–220 cm").max(220, "身高需在 120–220 cm"),
  weightKg: z.coerce.number().min(30, "体重需在 30–250 kg").max(250, "体重需在 30–250 kg"),
  goal: z.enum(["MUSCLE_GAIN", "FAT_LOSS", "SHAPING", "STRENGTH", "MAINTAIN"]),
  daysPerWeek: z.coerce.number().int().min(2, "每周至少 2 天").max(6, "每周最多 6 天"),
  equipment: z.enum(["GYM", "DUMBBELL", "BODYWEIGHT"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  targetWeightKg: z
    .union([z.literal(""), z.coerce.number().min(30).max(250)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
});

export type ActionState = { error?: string } | null;
