import { prisma } from "@/lib/db";
import { getCurrentAccount } from "@/lib/account";

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** GET /api/export/body-metrics —— 体重记录 CSV */
export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return new Response("未登录", { status: 401 });
  }

  const metrics = await prisma.bodyMetric.findMany({
    where: { accountId: account.id },
    orderBy: { date: "asc" },
    select: { date: true, weightKg: true, bodyFatPct: true, muscleKg: true },
  });

  const rows = [
    ["日期", "体重(kg)", "体脂(%)", "肌肉量(kg)"],
    ...metrics.map((m) => [
      m.date.toISOString().slice(0, 10),
      Number(m.weightKg),
      m.bodyFatPct ? Number(m.bodyFatPct) : "",
      m.muscleKg ? Number(m.muscleKg) : "",
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="body-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
