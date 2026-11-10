import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自建容器部署需要 standalone 产物；Vercel 有自己的一套打包方式，两者不要同时开
  output: process.env.VERCEL ? undefined : "standalone",
  // dev 与 build 用不同产物目录，避免每次切换模式都要清空对方的缓存
  // NEXT_DIST_DIR 可覆盖（CI 里一次构建一个空目录，就不会去清理上一次的产物）
  distDir:
    process.env.NEXT_DIST_DIR ??
    (process.env.NODE_ENV === "production" ? ".next" : ".next-dev"),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
