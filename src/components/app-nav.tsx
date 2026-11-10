"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, House, User, UtensilsCrossed } from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";

const NAV = [
  { href: "/home", label: "首页", icon: House },
  { href: "/plan", label: "计划", icon: CalendarDays },
  { href: "/nutrition", label: "饮食", icon: UtensilsCrossed },
  { href: "/exercises", label: "动作库", icon: BookOpen },
  { href: "/me", label: "我的", icon: User },
];

export function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* 移动：顶部品牌栏，点标识回首页 */}
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
        <Link href="/home" aria-label="回到首页" className="w-fit">
          <BrandLockup />
        </Link>
      </header>

      {/* 桌面：左侧固定栏 */}
      <aside className="hidden w-60 shrink-0 border-r border-line px-3 py-6 md:block">
        <Link href="/home" className="mb-8 w-fit px-2">
          <BrandLockup />
        </Link>

        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-ripple
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-sunken hover:text-ink"
                }`}
              >
                <item.icon className="size-[18px]" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 移动：底部 Tab */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-around">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-ripple
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-brand" : "text-ink-3"
                }`}
              >
                <item.icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
