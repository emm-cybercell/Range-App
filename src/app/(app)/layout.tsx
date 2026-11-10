import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/account";
import { AppNav } from "@/components/app-nav";

// 整个应用区依赖登录态与当前时间，放弃静态预渲染（Next 16 PPR 需要显式声明）
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const account = await requireAccount();
  if (!account) redirect("/login");
  if (!account.onboarded) redirect("/onboarding");

  return (
    // 移动端纵向（顶部品牌栏 + 内容），桌面端横向（左侧栏 + 内容）
    <div className="min-h-screen md:flex">
      <AppNav />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>
    </div>
  );
}
