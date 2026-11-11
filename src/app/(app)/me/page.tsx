import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccount } from "@/lib/account";
import { calcMetabolic, GOAL_LABEL, type Goal, type Sex } from "@/lib/metabolic";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const SEX_LABEL: Record<string, string> = { MALE: "男", FEMALE: "女" };
const EQUIPMENT_LABEL: Record<string, string> = {
  GYM: "健身房",
  DUMBBELL: "哑铃 + 徒手",
  BODYWEIGHT: "纯徒手",
};
const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "新手",
  INTERMEDIATE: "进阶",
  ADVANCED: "老手",
};

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function MePage() {
  const account = await requireAccount();
  if (!account) return null;

  const profile = await prisma.profile.findUnique({ where: { accountId: account.id } });

  const derived =
    profile?.sex && profile.age && profile.heightCm && profile.weightKg && profile.goal && profile.daysPerWeek
      ? calcMetabolic({
          sex: profile.sex as Sex,
          age: profile.age,
          heightCm: Number(profile.heightCm),
          weightKg: Number(profile.weightKg),
          goal: profile.goal as Goal,
          daysPerWeek: profile.daysPerWeek,
        })
      : null;

  const rows: [string, string][] = [
    ["身份", account.type === "USER" ? (account.email ?? "已注册") : "未登录"],
    ["性别 / 年龄", `${SEX_LABEL[profile?.sex ?? ""] ?? "—"} / ${profile?.age ?? "—"}`],
    ["身高", profile?.heightCm ? `${Number(profile.heightCm)} cm` : "—"],
    ["体重", profile?.weightKg ? `${Number(profile.weightKg)} kg` : "—"],
    ["训练目标", profile?.goal ? GOAL_LABEL[profile.goal as Goal] : "—"],
    ["每周训练", profile?.daysPerWeek ? `${profile.daysPerWeek} 天` : "—"],
    ["器械条件", EQUIPMENT_LABEL[profile?.equipment ?? ""] ?? "—"],
    ["经验", LEVEL_LABEL[profile?.level ?? ""] ?? "—"],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">我的</h1>
        <ThemeToggle />
      </header>

      {account.type !== "USER" ? (
        <section className="mt-5 rounded-card border border-brand/30 bg-brand-soft/50 p-4">
          <p className="text-sm font-semibold">当前是游客模式</p>
          <p className="mt-1 text-[12px] leading-5 text-ink-2">
            注册后训练记录会跟着账号走，换台设备也能接着练。
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/register"
              className="flex h-10 flex-1 items-center justify-center rounded-btn bg-brand text-[13px] font-semibold text-white"
            >
              注册账号
            </Link>
            <Link
              href="/login"
              className="flex h-10 flex-1 items-center justify-center rounded-btn border border-line bg-surface text-[13px] font-medium text-ink-2"
            >
              已有账号，登录
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-base font-bold text-brand">
            {account.nickname.slice(0, 1)}
          </span>
          <div>
            <p className="text-base font-semibold">{account.nickname}</p>
            <p className="text-xs text-ink-3">
              {account.type === "USER" ? account.email : "未登录"}
            </p>
          </div>
        </div>

        {derived ? (
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-sunken py-3 text-center">
            {[
              ["BMI", derived.bmi],
              ["BMR", derived.bmr],
              ["TDEE", derived.tdee],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[11px] text-ink-3">{label}</p>
                <p className="num text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-5 py-3.5 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="text-sm text-ink-2">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </section>

      <Link
        href="/me/body"
        className="mt-4 flex items-center justify-between rounded-card border border-line bg-surface px-5 py-4"
      >
        <span className="text-sm font-medium">身体数据</span>
        <span className="text-[12px] text-ink-3">体重趋势 →</span>
      </Link>

      <Link
        href="/stats"
        className="mt-3 flex items-center justify-between rounded-card border border-line bg-surface px-5 py-4"
      >
        <span className="text-sm font-medium">数据统计</span>
        <span className="text-[12px] text-ink-3">容量 · 部位分布 · 连续打卡 →</span>
      </Link>

      <Link
        href="/me/settings"
        className="mt-3 flex items-center justify-between rounded-card border border-line bg-surface px-5 py-4"
      >
        <span className="text-sm font-medium">设置</span>
        <span className="text-[12px] text-ink-3">外观 · 导出 · 清除记录 →</span>
      </Link>

      <LogoutButton />

      <p className="mt-6 text-center text-[12px] text-ink-3">练迹 v0.1</p>

      <section className="mt-6 rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] font-medium">素材来源</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-ink-3">
          <li>
            动作演示 ©{" "}
            <a href="https://gymvisual.com/" target="_blank" rel="noreferrer" className="underline">
              Gym visual
            </a>
            ，经{" "}
            <a
              href="https://github.com/hasaneyldrm/exercises-dataset"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Exercises Dataset
            </a>{" "}
            分发
          </li>
          <li>
            部分动作插图{" "}
            <a href="https://gymbells.app/" target="_blank" rel="noreferrer" className="underline">
              GymBells
            </a>
            ，依{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              CC BY-NC 4.0
            </a>{" "}
            使用
          </li>
        </ul>
      </section>
    </div>
  );
}
