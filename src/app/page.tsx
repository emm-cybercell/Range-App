import Link from "next/link";
import { ArrowRight, Clock3, Dumbbell, LineChart, UtensilsCrossed } from "lucide-react";

const templates = [
  {
    name: "新手全身启动",
    meta: "每周 2–3 天 · 5 个动作",
    desc: "每个部位每周练到 2 次，先把动作模式练对。",
  },
  {
    name: "上下肢分化",
    meta: "每周 4 天 · 上肢 / 下肢交替",
    desc: "容量和恢复最平衡，适合有半年基础的人。",
  },
  {
    name: "推拉腿 PPL",
    meta: "每周 3 或 6 天 · 推 / 拉 / 腿",
    desc: "按动作模式分化，进阶训练者的标准选择。",
  },
];

const features = [
  {
    icon: Dumbbell,
    title: "今天练什么，一眼看到",
    desc: "按目标、每周天数、器械条件推荐计划。每个动作的目标组数、次数、休息时间都写清楚。",
  },
  {
    icon: Clock3,
    title: "记一组，点一下",
    desc: "重量自动带出上次成绩，勾选即完成，组间倒计时自动开始。训练被打断，回来还能接着练。",
  },
  {
    icon: LineChart,
    title: "进步看得见",
    desc: "周容量、部位分布、连续打卡、日历热力图。数据不会安慰你，但它不会骗你。",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[10px] bg-brand text-sm font-bold text-white">
              练
            </span>
            <span className="text-[17px] font-semibold tracking-tight">练迹</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-ink-2 sm:flex">
            <span className="transition-colors hover:text-ink">动作库</span>
            <span className="transition-colors hover:text-ink">训练计划</span>
            <span className="transition-colors hover:text-ink">饮食记录</span>
          </nav>
          <Link
            href="/onboarding"
            className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            开始训练
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-20 sm:px-8 md:grid-cols-2 md:items-center md:pt-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              <span className="size-1.5 rounded-full bg-brand" />
              新手也能照着练
            </span>
            <h1 className="mt-5 text-[34px] leading-[1.15] font-bold tracking-tight sm:text-[44px]">
              选好计划，
              <br />
              今天该练什么
              <span className="text-brand">一目了然</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-2">
              练完点一下，重量和次数自动记住。数据会自己长成曲线，你只需要每周多来一次。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex h-13 items-center gap-2 rounded-btn bg-brand px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                3 分钟开始训练
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* 产品卡预览（纯 CSS，不依赖图片） */}
          <div>
            <div className="rounded-card border border-line bg-surface p-5 shadow-[0_8px_40px_rgba(20,35,28,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-3">今天 · 周一</p>
                  <p className="mt-1 text-lg font-semibold">上肢 A</p>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-[#14231C]">
                  第 3 练
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  ["杠铃卧推", "4 × 6–10", true],
                  ["杠铃划船", "4 × 6–10", true],
                  ["站姿推举", "3 × 8–12", false],
                  ["高位下拉", "3 × 10–12", false],
                ].map(([name, target, done]) => (
                  <div
                    key={name as string}
                    className="flex items-center gap-3 rounded-xl bg-sunken px-3 py-2.5"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        done ? "bg-brand text-white" : "border-[1.5px] border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1 text-sm font-medium">{name as string}</span>
                    <span className="num text-xs text-ink-2">{target as string}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-3 py-3">
                <span className="text-xs text-ink-2">组间休息</span>
                <span className="num text-2xl font-bold tracking-tight text-brand">01:12</span>
              </div>
            </div>

            <div className="mt-3 inline-flex flex-col rounded-2xl border border-line bg-surface px-4 py-2.5">
              <span className="text-[11px] text-ink-3">本周容量</span>
              <span className="num text-lg leading-6 font-bold">
                12,450<span className="ml-1 text-xs font-medium text-ink-2">kg</span>
              </span>
            </div>
          </div>
        </section>

        {/* 卖点 */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <f.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 计划模板 */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">先给你三套现成的</h2>
              <p className="mt-2 text-sm text-ink-2">不确定练什么，就从这里选一套，之后随时能改。</p>
            </div>
            <span className="hidden text-sm text-ink-3 sm:block">共 5 套计划模板</span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.name}
                className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-brand/40"
              >
                <h3 className="text-base font-semibold">{t.name}</h3>
                <p className="mt-1 text-xs text-ink-3">{t.meta}</p>
                <p className="mt-3 text-sm leading-6 text-ink-2">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 饮食 */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
          <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/25 text-brand">
              <UtensilsCrossed className="size-6" strokeWidth={1.8} />
            </span>
            <div className="flex-1">
              <h3 className="text-base font-semibold">练得对，也要吃得对</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-2">
                常见中式食物随手搜，按餐记录，热量和蛋白自动算，每天的额度还剩多少一目了然。
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>练迹 · 一个不用学就会用的训练记录本</span>
          <span>© 2026 练迹</span>
        </div>
      </footer>
    </div>
  );
}
