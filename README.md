# 练迹 Range · 轻量健身训练 Web 应用

选好计划，今天该练什么一目了然。练完点一下，数据自动长成曲线。

> 中文名「练迹」，英文代号 `range`。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 样式 | Tailwind CSS v4（CSS 变量双主题） |
| 数据 | Prisma 7 + PostgreSQL 16 |
| 状态 | React 19 `useActionState` + Server Actions（训练会话状态在客户端组件内维护） |
| 图表 | 纯 CSS / SVG 手绘（不引入图表库，统计页零额外 JS） |
| 图标 | lucide-react |

## 本地启动

```bash
# 1. 起数据库（需 Docker Desktop 已启动）
docker compose up -d

# 2. 安装依赖
npm install

# 3. 建表
npm run db:push

# 4. 灌入种子数据（20 肌肉群 / 60 动作 / 200 食物 / 60 标语）
npm run db:seed

# 5. 启动
npm run dev
```

打开 http://localhost:3000

> 数据库映射在 **55432** 端口：Windows 的 Hyper-V 会保留 5241–5440 段，5432/5433 都起不来。改动见 `docker-compose.yml` 与 `.env`。

**验证数据是否就绪**：访问 http://localhost:3000/api/health

```json
{ "ok": true, "data": { "db": "connected", "muscles": 20, "exercises": 60, "foods": 200, "quotes": 60 } }
```

## 部署

生产环境只需要两样东西：**一个 PostgreSQL 16 实例** + **一个 Node 22 运行时**。构建产物是 Next 的 standalone 包（`output: "standalone"`）。

### 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/range?schema=public` |
| `SESSION_SECRET` | ✅ | 会话签名密钥，`openssl rand -hex 32` 生成；**生产未设置会直接启动失败** |
| `POSTGRES_PASSWORD` | Docker 方式 | 数据库密码，`docker-compose.prod.yml` 使用 |

### 方式一：Docker（推荐）

```bash
cd web
export POSTGRES_PASSWORD='<强密码>'
export SESSION_SECRET="$(openssl rand -hex 32)"

# 首次初始化（只跑一次）：建表 + 种子数据
docker compose -f docker-compose.prod.yml up -d db
DATABASE_URL="postgresql://range:$POSTGRES_PASSWORD@localhost:5432/range?schema=public" \
  npm run db:push && npm run db:seed

# 启动应用
docker compose -f docker-compose.prod.yml up -d --build
```

### 方式二：Vercel + Neon（免费，推荐）

1. **Neon 建库**：新建 Project，复制 **Pooled connection string**（主机名带 `-pooler`）：
   ```
   postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   > 必须用连接池串。Vercel 是 Serverless，每个函数实例都会新建连接，直连串几十次请求就会打满 Neon 的连接上限。

2. **初始化生产库**（在本地对着这个库跑一次）：
   ```bash
   cd web
   DATABASE_URL="<上面那串>" npm run db:push
   DATABASE_URL="<上面那串>" npm run db:seed
   ```

3. **Vercel 导入**：Import Git Repository → Root Directory 填 `web` → 环境变量加两个：

   | 变量 | 值 |
   |---|---|
   | `DATABASE_URL` | 第 1 步的连接池串 |
   | `SESSION_SECRET` | `openssl rand -hex 32` 生成 |

4. Deploy。之后每次 push 自动重新部署。

> `package.json` 里的 `postinstall: prisma generate` 是给 Vercel 构建用的——Prisma 客户端生成物没入库，构建时必须现生成。

### 部署后自检

| 检查 | 期望 |
|---|---|
| `GET /api/health` | `{"ok":true,"data":{"db":"connected","muscles":20,...}}` |
| 注册 → 建档 → 选计划 | 能进 `/plan` 并看到排期 |
| 训练页记一组 → 完成 | 打卡页显示容量与组数 |
| 日志中无 `PrismaClientInitializationError` | 数据库连接正常 |



## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（Turbopack） |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm run db:push` | 同步 schema 到数据库（开发期） |
| `npm run db:seed` | 幂等写入种子数据，可重复执行 |
| `npm run db:studio` | 可视化查看数据 |
| `npm run db:reset` | 清库 + 迁移 + seed（**会删数据**） |

## 目录

```
web/
├── prisma/
│   ├── schema.prisma        # 18 个模型 / 15 个枚举
│   ├── seed.ts              # 幂等种子脚本
│   └── seed/                # 种子数据（JSON，与代码解耦）
│       ├── muscles.json     # 6 部位 / 20 肌肉群
│       ├── exercises.json   # 60 个动作（步骤/要点/错误/替代）
│       ├── foods.json       # 200 条中式食物（每 100g 营养）
│       ├── quotes.json      # 60 条标语（4 类）
│       └── plan-templates.json  # 5 套计划模板
├── src/
│   ├── app/                 # 路由
│   ├── lib/db.ts            # Prisma 单例
│   └── generated/prisma/    # Prisma 生成产物（不入库）
└── docker-compose.yml       # 本地 Postgres
```

## 文档

- `../docs/01-PRD.md` — 产品需求（10 个功能模块 / 15 个页面 / 视觉规范）
- `../docs/02-API.md` — 77 个接口 / 错误码 / Query Key 规范
- `../docs/03-SCHEMA.md` — 数据模型 / 快照策略 / 统计口径

## 设计 Token

颜色、圆角、字体全部在 `src/app/globals.css` 的 CSS 变量里，深色模式由 `<html class="dark">` 切换。

| Token | 浅色 | 深色 |
|---|---|---|
| canvas | `#F6F8F5` | `#0C110E` |
| surface | `#FFFFFF` | `#151C18` |
| brand | `#1F9C6B` | `#34D399` |
| accent | `#C8F169` | `#C8F169` |
| ink | `#14231C` | `#EAF2EC` |

用法：`bg-canvas` `bg-surface` `text-ink` `text-ink-2` `border-line` `bg-brand` `text-brand` `bg-accent`
