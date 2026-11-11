"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 客户端重定向。
 *
 * 为什么不在服务端 layout 里直接 redirect()：
 * 在服务端 action 的响应重渲染阶段，layout 抛出的 NEXT_REDIRECT 会中断整个响应，
 * 表现就是「注册成功但页面不动、会话没写进去」。改成挂载后跳转，服务端渲染不再抛错。
 */
export function RedirectOnMount({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return null;
}
