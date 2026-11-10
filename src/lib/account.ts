import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { readGuestKey, readSession } from "@/lib/session";

export type CurrentAccount = {
  id: string;
  type: "USER" | "GUEST";
  nickname: string;
  email: string | null;
  onboarded: boolean;
};

/**
 * 解析当前请求的账号。
 * 优先会话 cookie；没有则用游客 cookie 惰性创建匿名 Account
 * （游客也走同一套业务表，注册时整表迁移，避免双份代码路径）。
 */
export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const session = await readSession();

  if (session) {
    const account = await prisma.account.findFirst({
      where: { id: session.accountId, deletedAt: null },
      include: { profile: { select: { completedAt: true } } },
    });
    if (account) {
      return {
        id: account.id,
        type: account.type,
        nickname: account.nickname,
        email: account.email,
        onboarded: Boolean(account.profile?.completedAt),
      };
    }
  }

  const guestKey = await readGuestKey();
  if (!guestKey) return null;

  const existing = await prisma.account.findUnique({
    where: { id: guestKey },
    include: { profile: { select: { completedAt: true } } },
  });
  if (existing) {
    return {
      id: existing.id,
      type: existing.type,
      nickname: existing.nickname,
      email: existing.email,
      onboarded: Boolean(existing.profile?.completedAt),
    };
  }

  const created = await prisma.account.create({
    data: { id: guestKey, type: "GUEST", setting: { create: {} } },
    include: { profile: { select: { completedAt: true } } },
  });

  return {
    id: created.id,
    type: "GUEST",
    nickname: created.nickname,
    email: null,
    onboarded: false,
  };
}

/**
 * 页面组件专用：先声明按请求渲染，再解析账号。
 *  Cookies 与 token 过期校验都依赖请求期的真实时间，
 * 必须显式告知 Next 不要走预渲染，否则会报 unstable value 错误。
 */
export async function requireAccount(): Promise<CurrentAccount | null> {
  await connection();
  return getCurrentAccount();
}

/** 把游客名下的全部业务数据迁到注册账号，然后删除游客账号 */export async function migrateGuestData(guestId: string, userId: string) {
  if (guestId === userId) return;

  // 唯一约束会冲突的行（Profile/Setting 一对一、WaterLog 按日唯一、收藏联合主键）
  // 迁移前先清掉目标账号上的同名数据，避免整笔事务失败。
  const guestProfileCount = await prisma.profile.count({ where: { accountId: guestId } });
  if (guestProfileCount > 0) {
    await prisma.$transaction([
      prisma.profile.deleteMany({ where: { accountId: userId } }),
      prisma.setting.deleteMany({ where: { accountId: userId } }),
      prisma.waterLog.deleteMany({ where: { accountId: userId } }),
      prisma.exerciseFavorite.deleteMany({ where: { accountId: userId } }),
    ]);
  }

  await prisma.$transaction([
    prisma.profile.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.bodyMetric.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.measurement.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.plan.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.workoutSession.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.mealEntry.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.waterLog.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.food.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.exerciseFavorite.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.clientOp.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.setting.updateMany({ where: { accountId: guestId }, data: { accountId: userId } }),
    prisma.account.delete({ where: { id: guestId } }),
  ]);
}
