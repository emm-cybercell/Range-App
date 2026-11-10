import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { DangerZone, SettingsClient } from "./settings-client";

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function SettingsPage() {
  const account = await requireAccount();
  if (!account) return null;

  const [workoutCount, mealCount] = await Promise.all([
    prisma.workoutSession.count({ where: { accountId: account.id, status: "COMPLETED" } }),
    prisma.mealEntry.count({ where: { accountId: account.id } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <PageHeader title="设置" back={{ href: "/me", label: "我的" }} />

      {/* 外观 */}
      <section className="mt-5 rounded-card border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">外观</h2>
        <p className="mt-0.5 mb-3 text-[11px] text-ink-3">跟随系统时会随你的设备自动切换</p>
        <SettingsClient />
      </section>

      {/* 导出 */}
      <section className="mt-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">导出数据</h2>
        <p className="mt-0.5 text-[11px] text-ink-3">
          共 {workoutCount} 次训练、{mealCount} 条饮食记录
        </p>
        <div className="mt-3 space-y-2">
          <a
            href="/api/export/workouts"
            className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm transition-colors hover:border-ink-3/40"
          >
            <span>训练记录</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
              <Download className="size-3.5" />
              CSV
            </span>
          </a>
          <a
            href="/api/export/body-metrics"
            className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm transition-colors hover:border-ink-3/40"
          >
            <span>体重记录</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
              <Download className="size-3.5" />
              CSV
            </span>
          </a>
        </div>
      </section>

      {/* 账号 */}
      <section className="mt-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">账号</h2>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-2">登录方式</span>
          <span className="font-medium">{account.type === "USER" ? account.email : "未登录"}</span>
        </div>
      </section>

      {/* 危险操作 */}
      <section className="mt-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">清除记录</h2>
        <div className="mt-2">
          <DangerZone />
        </div>
      </section>
    </div>
  );
}
