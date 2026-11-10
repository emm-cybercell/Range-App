import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { FilterPanel } from "@/components/filter-panel";

const BODY_PART_LABEL: Record<string, string> = {
  CHEST: "胸",
  BACK: "背",
  SHOULDERS: "肩",
  ARMS: "手臂",
  LEGS: "腿",
  CORE: "核心",
};

const EQUIPMENT_LABEL: Record<string, string> = {
  BARBELL: "杠铃",
  DUMBBELL: "哑铃",
  MACHINE: "器械",
  CABLE: "绳索",
  BODYWEIGHT: "自重",
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "新手",
  INTERMEDIATE: "进阶",
  ADVANCED: "老手",
};

type Params = { q?: string; part?: string; equip?: string };

// 依赖登录态与请求期数据，按请求渲染
export const instant = false;

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const part = sp.part ?? "";
  const equip = sp.equip ?? "";

  const exercises = await prisma.exercise.findMany({
    where: {
      active: true,
      ...(part ? { bodyPart: part as never } : {}),
      ...(equip ? { equipment: equip as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { nameEn: { contains: q, mode: "insensitive" as const } },
              { pinyin: { contains: q.toLowerCase() } },
              { pinyinInitials: { contains: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: { primaryMuscle: { select: { name: true } } },
    orderBy: [{ bodyPart: "asc" }, { name: "asc" }],
    take: 200,
  });

  const buildHref = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    const merged = { q, part, equip, ...patch };
    if (merged.q) next.set("q", merged.q);
    if (merged.part) next.set("part", merged.part);
    if (merged.equip) next.set("equip", merged.equip);
    const qs = next.toString();
    return `/exercises${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">动作库</h1>
          <p className="mt-1 text-sm text-ink-2">{exercises.length} 个动作</p>
        </div>
        <ThemeToggle />
      </header>

      {/* 搜索 */}
      <form action="/exercises" className="mt-5">
        {part ? <input type="hidden" name="part" value={part} /> : null}
        {equip ? <input type="hidden" name="equip" value={equip} /> : null}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜动作名、英文名或拼音首字母（如 gbwt）"
            className="h-12 w-full rounded-xl border border-line bg-surface pr-3.5 pl-10 text-[15px] outline-none transition-colors placeholder:text-ink-3 focus:border-brand"
          />
        </div>
      </form>

      <FilterPanel>
      {/* 部位筛选 */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          <Link
            href={buildHref({ part: "" })}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              part === "" ? "bg-brand text-white" : "bg-sunken text-ink-2 hover:text-ink"
            }`}
          >
            全部
          </Link>
          {Object.entries(BODY_PART_LABEL).map(([value, label]) => (
            <Link
              key={value}
              href={buildHref({ part: part === value ? "" : value })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                part === value ? "bg-brand text-white" : "bg-sunken text-ink-2 hover:text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 器械筛选 */}
      <div className="-mx-4 mt-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          {Object.entries(EQUIPMENT_LABEL).map(([value, label]) => (
            <Link
              key={value}
              href={buildHref({ equip: equip === value ? "" : value })}
              className={`shrink-0 rounded-full border px-3 py-1 text-[12px] transition-colors ${
                equip === value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink-3 hover:text-ink-2"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      </FilterPanel>

      {/* 列表 */}
      {exercises.length === 0 ? (
        <div className="mt-12 rounded-card border border-line bg-surface p-10 text-center">
          <p className="text-base font-semibold">没有符合条件的动作</p>
          <p className="mt-1.5 text-sm text-ink-2">试试去掉一个筛选条件，或换个关键词。</p>
          <Link
            href="/exercises"
            className="mt-4 inline-flex h-10 items-center rounded-btn bg-brand px-4 text-sm font-medium text-white"
          >
            重置筛选
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {exercises.map((e) => (
            <Link
              key={e.id}
              href={`/exercises/${e.slug}`}
              data-ripple
              data-press
              className="group flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-brand/40"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sunken">
                {e.coverUrl ? (
                  <Image src={e.coverUrl} alt={e.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-lg font-bold text-ink-3">
                    {e.name.slice(0, 1)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{e.name}</p>
                <p className="truncate text-[11px] text-ink-3">{e.nameEn}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                    {e.primaryMuscle.name}
                  </span>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] text-ink-2">
                    {EQUIPMENT_LABEL[e.equipment]}
                  </span>
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] text-ink-2">
                    {LEVEL_LABEL[e.level]}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
