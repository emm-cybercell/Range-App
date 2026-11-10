import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** GET /api/export/workouts —— 训练记录 CSV（带 BOM，Excel 打开不乱码） */
export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return new Response("未登录", { status: 401 });
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { accountId: account.id, status: "COMPLETED" },
    orderBy: { date: "desc" },
    select: {
      date: true,
      planNameSnapshot: true,
      dayNameSnapshot: true,
      durationSec: true,
      totalSets: true,
      totalVolumeKg: true,
    },
  });

  const rows = [
    ["日期", "计划", "训练日", "时长(分)", "组数", "容量(kg)"],
    ...sessions.map((s) => [
      s.date.toISOString().slice(0, 10),
      s.planNameSnapshot ?? "",
      s.dayNameSnapshot ?? "",
      Math.round((s.durationSec ?? 0) / 60),
      s.totalSets ?? 0,
      Math.round(Number(s.totalVolumeKg ?? 0)),
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="workouts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
