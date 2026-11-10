import { getCurrentAccount } from "@/lib/account";
import { getTodayPlan, planDayMinutes } from "@/lib/plans";

/** GET /api/plans/today —— 今日训练（计划名 / 训练日 / 动作清单） */
export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return Response.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "会话已失效" } },
      { status: 401 },
    );
  }

  const { plan, day, isTrainingDay, upcoming } = await getTodayPlan(account.id);

  if (!plan) {
    return Response.json({ ok: true, data: { hasPlan: false, isTrainingDay: false, day: null } });
  }

  return Response.json({
    ok: true,
    data: {
      hasPlan: true,
      plan: { id: plan.id, name: plan.name },
      isTrainingDay,
      day: day
        ? {
            id: day.id,
            name: day.name,
            weekday: day.weekday,
            estimatedMin: planDayMinutes(day),
            exercises: day.exercises.map((e) => ({
              id: e.id,
              order: e.order,
              slug: e.exercise.slug,
              name: e.exercise.name,
              bodyPart: e.exercise.bodyPart,
              muscle: e.exercise.primaryMuscle.name,
              targetSets: e.targetSets,
              repsMin: e.repsMin,
              repsMax: e.repsMax,
              restSec: e.restSec,
            })),
          }
        : null,
      upcoming: upcoming
        ? { name: upcoming.day.name, weekday: upcoming.day.weekday, inDays: upcoming.distance }
        : null,
    },
  });
}
