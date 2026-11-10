import type { ReactNode } from "react";
import { connection } from "next/server";

// 训练页依赖登录态与实时数据，按请求渲染
export const instant = false;

export default async function WorkoutLayout({ children }: { children: ReactNode }) {
  await connection();
  return <>{children}</>;
}
