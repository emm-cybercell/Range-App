import { prisma } from "@/lib/db";

/** GET /api/health —— 部署自检：数据库连通性与种子数据量 */
export async function GET() {
  try {
    const [muscles, exercises, foods, quotes] = await Promise.all([
      prisma.muscle.count(),
      prisma.exercise.count(),
      prisma.food.count(),
      prisma.quote.count(),
    ]);

    return Response.json({
      ok: true,
      data: { db: "connected", muscles, exercises, foods, quotes },
    });
  } catch (error) {
    // 只回一句可读的原因，不把驱动堆栈和连接串暴露给调用方
    const reason =
      error instanceof Error && /ECONNREFUSED|ETIMEDOUT|Can't reach database/i.test(error.message)
        ? "数据库连不上，检查 DATABASE_URL 与数据库进程"
        : "数据库访问异常，查看服务端日志";

    console.error("[health] 数据库检查失败：", error);

    return Response.json(
      { ok: false, error: { code: "DB_UNAVAILABLE", message: reason } },
      { status: 503 },
    );
  }
}
