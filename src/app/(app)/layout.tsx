import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/account";
import { AppNav } from "@/components/app-nav";

/**
 * 应用区外壳。
 * 登录校验放在 Suspense 内的 AuthGate，而不是 layout 顶层——
 * 顶层 await 会把 {children} 一起拖进阻塞区，导致所有子页面都没有静态壳。
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <AppNav />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <Suspense fallback={<PageShellSkeleton />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </div>
    </div>
  );
}

async function AuthGate({ children }: { children: ReactNode }) {
  const account = await requireAccount();
  if (!account) redirect("/login");
  if (!account.onboarded) redirect("/onboarding");
  return <>{children}</>;
}

function PageShellSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <div className="h-7 w-32 animate-pulse rounded bg-sunken" />
      <div className="mt-2 h-4 w-48 animate-pulse rounded bg-sunken" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-sunken" />
        ))}
      </div>
    </div>
  );
}
