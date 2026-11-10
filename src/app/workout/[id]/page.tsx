import { notFound, redirect } from "next/navigation";
import { requireAccount } from "@/lib/account";
import { elapsedSeconds, getSession, loadLastPerformance } from "@/lib/workouts";
import { WorkoutClient, type ExerciseBlock } from "./workout-client";

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await requireAccount();
  if (!account) redirect("/login");

  const session = await getSession(account.id, id);
  if (!session) notFound();

  if (session.status === "COMPLETED") redirect(`/workout/${id}/done`);
  if (session.status === "ABANDONED") redirect("/plan");

  const exerciseIds = session.exercises
    .map((e) => e.exerciseId)
    .filter((v): v is string => Boolean(v));

  const lastMap = await loadLastPerformance(account.id, exerciseIds);

  const blocks: ExerciseBlock[] = session.exercises.map((item) => ({
    id: item.id,
    name: item.exerciseNameSnapshot,
    muscle: item.muscleNameSnapshot ?? "",
    targetSets: item.targetSets,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
    restSec: item.restSec,
    status: item.status,
    sets: item.sets.map((s) => ({
      id: s.id,
      setIndex: s.setIndex,
      weightKg: Number(s.weightKg),
      reps: s.reps,
      isWarmup: s.isWarmup,
    })),
    last: item.exerciseId
      ? (() => {
          const found = lastMap.get(item.exerciseId);
          return found ? { date: found.date, sets: found.sets } : null;
        })()
      : null,
  }));

  return (
    <WorkoutClient
      sessionId={session.id}
      planName={session.planNameSnapshot ?? "自由训练"}
      dayName={session.dayNameSnapshot ?? "训练"}
      initialElapsedSec={elapsedSeconds(session.startedAt)}
      exercises={blocks}
    />
  );
}
