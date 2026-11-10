import { prisma } from "@/lib/db";

export type Stats = {
  week: { count: number; target: number; volumeKg: number; sets: number; durationMin: number };
  streakDays: number;
  bodyParts: { bodyPart: string; sets: number; percent: number }[];
  weeklyVolume: { label: string; volumeKg: number; isCurrent: boolean }[];
  heatmap: { date: string; volumeKg: number; level: number }[];
  totalWorkouts: number;
  totalVolumeKg: number;
};

const BODY_PART_ORDER = ["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"];

const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfWeek = (d: Date) => {
  const copy = new Date(d);
  const day = copy.getDay() === 0 ? 7 : copy.getDay();
  copy.setDate(copy.getDate() - (day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export async function getStats(accountId: string, weeklyTarget: number): Promise<Stats> {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const [sessions, bodyPartRows, totals] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { accountId, status: "COMPLETED" },
      select: { date: true, durationSec: true, totalVolumeKg: true, totalSets: true },
      orderBy: { date: "desc" },
    }),
    prisma.workoutSet.findMany({
      where: {
        isWarmup: false,
        workoutExercise: { session: { accountId, status: "COMPLETED" } },
      },
      select: { workoutExercise: { select: { bodyPartSnapshot: true } } },
    }),
    prisma.workoutSession.aggregate({
      where: { accountId, status: "COMPLETED" },
      _sum: { totalVolumeKg: true },
      _count: true,
    }),
  ]);

  const thisWeek = sessions.filter((s) => s.date >= weekStart);
  const week = {
    count: thisWeek.length,
    target: weeklyTarget,
    volumeKg: Math.round(thisWeek.reduce((sum, s) => sum + Number(s.totalVolumeKg ?? 0), 0)),
    sets: thisWeek.reduce((sum, s) => sum + (s.totalSets ?? 0), 0),
    durationMin: Math.round(thisWeek.reduce((sum, s) => sum + (s.durationSec ?? 0), 0) / 60),
  };

  // 连续打卡：从今天或昨天开始往前数，间隔 ≤ 2 天算连续
  const days = [...new Set(sessions.map((s) => dateKey(s.date)))].sort().reverse();
  let streakDays = 0;
  if (days.length > 0) {
    const cursor = new Date(`${days[0]}T00:00:00`);
    const gapToToday = Math.floor((Number(now) - Number(cursor)) / 86_400_000);
    if (gapToToday <= 1) {
      streakDays = 1;
      for (let i = 1; i < days.length; i += 1) {
        const prev = new Date(`${days[i - 1]}T00:00:00`);
        const cur = new Date(`${days[i]}T00:00:00`);
        const gap = Math.round((Number(prev) - Number(cur)) / 86_400_000);
        if (gap <= 2) streakDays += 1;
        else break;
      }
    }
  }

  const partCounter = new Map<string, number>();
  for (const row of bodyPartRows) {
    const key = row.workoutExercise.bodyPartSnapshot;
    partCounter.set(key, (partCounter.get(key) ?? 0) + 1);
  }
  const partTotal = [...partCounter.values()].reduce((a, b) => a + b, 0);
  const bodyParts = BODY_PART_ORDER.map((part) => {
    const sets = partCounter.get(part) ?? 0;
    return { bodyPart: part, sets, percent: partTotal ? Math.round((sets / partTotal) * 100) : 0 };
  }).filter((p) => p.sets > 0);

  // 近 8 周容量
  const weeklyVolume: Stats["weeklyVolume"] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const volume = sessions
      .filter((s) => s.date >= start && s.date < end)
      .reduce((sum, s) => sum + Number(s.totalVolumeKg ?? 0), 0);
    weeklyVolume.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      volumeKg: Math.round(volume),
      isCurrent: i === 0,
    });
  }

  // 近 12 周热力图，按容量分 4 档
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const key = dateKey(s.date);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(s.totalVolumeKg ?? 0));
  }
  const maxVolume = Math.max(1, ...byDay.values());
  const heatmap: Stats["heatmap"] = [];
  for (let i = 83; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const volume = Math.round(byDay.get(key) ?? 0);
    const ratio = volume / maxVolume;
    heatmap.push({
      date: key,
      volumeKg: volume,
      level: volume === 0 ? 0 : ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1,
    });
  }

  return {
    week,
    streakDays,
    bodyParts,
    weeklyVolume,
    heatmap,
    totalWorkouts: totals._count,
    totalVolumeKg: Math.round(Number(totals._sum.totalVolumeKg ?? 0)),
  };
}
