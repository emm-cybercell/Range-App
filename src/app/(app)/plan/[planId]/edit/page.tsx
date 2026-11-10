import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/account";
import { prisma } from "@/lib/db";
import { PlanEditor, type EditorDay } from "./plan-editor";

// 依赖 params 与登录态，按请求渲染
export const instant = false;

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const account = await requireAccount();
  if (!account) return null;

  const plan = await prisma.plan.findFirst({
    where: { id: planId, accountId: account.id, deletedAt: null },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  bodyPart: true,
                  equipment: true,
                  primaryMuscle: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) notFound();

  const days: EditorDay[] = plan.days.map((day) => ({
    id: day.id,
    name: day.name,
    weekday: day.weekday,
    exercises: day.exercises.map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      name: item.exercise.name,
      bodyPart: item.exercise.bodyPart,
      equipment: item.exercise.equipment,
      muscle: item.exercise.primaryMuscle.name,
      targetSets: item.targetSets,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      restSec: item.restSec,
    })),
  }));

  return (
    <PlanEditor
      planId={plan.id}
      planName={plan.name}
      updatedAt={plan.updatedAt.toISOString()}
      initialDays={days}
    />
  );
}
