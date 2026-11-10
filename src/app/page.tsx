import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Dumbbell, LineChart, UtensilsCrossed } from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";
import { TodayCardFallback, TodayTrainingCard } from "./today-training-card";

const navLinks = [
  { href: "/exercises", label: "动作库" },
  { href: "/plan", label: "训练计划" },
  { href: "/nutrition", label: "饮食记录" },
];

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
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link href="/" aria-label="练迹首页">
            <BrandLockup />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-ink-2 sm:flex">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-btn px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              登录
            </Link>
            <Link
              href="/onboarding"
              className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              开始训练
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* 背景装饰：网格 + 光晕，纯 CSS/SVG，不增加请求 */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 0)",
                backgroundSize: "22px 22px",
                maskImage: "radial-gradient(ellipse 70% 60% at 30% 20%, #000 30%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 60% at 30% 20%, #000 30%, transparent 75%)",
              }}
            />
            <div className="absolute -top-24 -right-10 size-[420px] rounded-full bg-brand/10 blur-[90px]" />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-20 sm:px-8 md:grid-cols-2 md:items-center md:pt-20">
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
                <Link
                  href="/login"
                  className="inline-flex h-13 items-center rounded-btn border border-line px-5 text-[15px] font-medium text-ink-2 transition-colors hover:border-ink-3/40 hover:text-ink"
                >
                  已有账号
                </Link>
              </div>
            </div>

            <Suspense fallback={<TodayCardFallback />}>
              <TodayTrainingCard />
            </Suspense>
          </div>
        </section>

        {/* 卖点 */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-8 md:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="group relative">
                <span className="num pointer-events-none absolute -top-3 right-0 text-[52px] leading-none font-bold text-line/60 select-none">
                  0{i + 1}
                </span>
                <span className="relative grid size-11 place-items-center rounded-xl bg-brand-soft text-brand transition-transform group-hover:-translate-y-0.5">
                  <f.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="relative mt-4 text-base font-semibold">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-ink-2">{f.desc}</p>
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
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
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

        {/* 收尾 CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
          <div className="relative overflow-hidden rounded-card border border-line bg-surface px-6 py-10 text-center sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 0)",
                backgroundSize: "18px 18px",
                maskImage: "radial-gradient(ellipse 60% 80% at 50% 0%, #000 20%, transparent 70%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 60% 80% at 50% 0%, #000 20%, transparent 70%)",
              }}
            />
            <h2 className="relative text-xl font-bold tracking-tight sm:text-2xl">
              今天该练什么，三分钟就有答案
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-ink-2">
              不用先想清楚，跟着计划走一遍就知道了。
            </p>
            <Link
              href="/onboarding"
              className="relative mt-6 inline-flex h-12 items-center gap-2 rounded-btn bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              开始训练
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>练迹 · 一个不用学就会用的训练记录本</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-ink">
              登录
            </Link>
            <Link href="/register" className="hover:text-ink">
              注册
            </Link>
            <span>© 2026 练迹</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
