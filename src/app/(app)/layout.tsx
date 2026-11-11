import { Suspense, type ReactNode } from "react";
import { RedirectOnMount } from "@/components/redirect-on-mount";
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
  // 注意：这里不要用服务端 redirect。它会在 action 响应重渲染时抛 NEXT_REDIRECT，
  // 导致首次注册/登录的响应被中断（表现为页面不动、会话丢失）。
  if (!account) return <RedirectOnMount to="/login" />;
  if (!account.onboarded) return <RedirectOnMount to="/onboarding" />;
  return <>{children}</>;
}

function PageShellSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <div className="h-7 w-32 skeleton rounded" />
      <div className="mt-2 h-4 w-48 skeleton rounded" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 skeleton rounded-card" />
        ))}
      </div>
    </div>
  );
}
