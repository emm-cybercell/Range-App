// 下载动作演示素材：Exercises Dataset 动图优先，GymBells 静态图兜底
// 用法：node scripts/import-exercise-media.mjs [--force] [--only=slug1,slug2]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "exercises");
const MAP_FILE = join(ROOT, "prisma", "seed", "exercise-media-map.json");
const SEED_FILE = join(ROOT, "prisma", "seed", "exercises.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",").map((s) => s.trim())) : null;

/**
 * Exercises Dataset 里这几条映射到的其实是另一个动作，改用 GymBells 的静态图。
 * 后续再发现错配，往这里加一行即可。
 */
const USE_GYMBELLS = new Set([
  "腕弯举",
  "徒手深蹲",
  "折刀俯卧撑",
  "杠铃臀推",
  "高位下拉",
]);

const JSDELIVR = (repo, path) => `https://cdn.jsdelivr.net/gh/${repo}@main/${path}`;
const RAW = (repo, path) => `https://raw.githubusercontent.com/${repo}/${"main"}/${path}`;

const CREDIT_GYMVISUAL = "动作演示 © Gym visual · gymvisual.com";
const CREDIT_GYMBELLS = "动作插图 GymBells · CC BY-NC 4.0";

mkdirSync(OUT_DIR, { recursive: true });

const mapping = JSON.parse(readFileSync(MAP_FILE, "utf8"));
const seed = JSON.parse(readFileSync(SEED_FILE, "utf8"));
const slugByName = new Map(seed.map((e) => [e.name, e.slug]));

async function download(urls, dest) {
  if (!force && existsSync(dest)) return "skip";

  let lastError = null;
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 1024) throw new Error(`内容过小 ${buffer.length}B`);
        writeFileSync(dest, buffer);
        return "ok";
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError ?? new Error("下载失败");
}

const jobs = [];
for (const item of mapping) {
  const slug = slugByName.get(item.name_zh);
  if (!slug) continue;
  if (only && !only.has(slug)) continue;

  const useGymBells = USE_GYMBELLS.has(item.name_zh);

  if (useGymBells) {
    const pose = item.gymbells.pose;
    const path = `images/${pose}/start.png`;
    jobs.push({
      slug,
      kind: "cover",
      file: `${slug}.png`,
      credit: CREDIT_GYMBELLS,
      urls: [JSDELIVR("gellyfish-ai/gymbells-exercises", path), RAW("gellyfish-ai/gymbells-exercises", path)],
    });
  } else {
    jobs.push({
      slug,
      kind: "demo",
      file: `${slug}.gif`,
      credit: CREDIT_GYMVISUAL,
      urls: [
        item.exercisedb.gif_url,
        JSDELIVR("hasaneyldrm/exercises-dataset", `videos/${item.exercisedb.id}-${item.exercisedb.gif_url.split("-").pop()}`),
      ],
    });
    jobs.push({
      slug,
      kind: "cover",
      file: `${slug}.jpg`,
      credit: CREDIT_GYMVISUAL,
      urls: [
        item.exercisedb.thumb_url,
        JSDELIVR("hasaneyldrm/exercises-dataset", `images/${item.exercisedb.id}-${item.exercisedb.thumb_url.split("-").pop()}`),
      ],
    });
  }
}

const results = { ok: [], skip: [], fail: [] };
const queue = [...jobs];
const CONCURRENCY = 4;

async function worker() {
  while (queue.length) {
    const job = queue.shift();
    if (!job) break;
    try {
      const status = await download(job.urls, join(OUT_DIR, job.file));
      (status === "ok" ? results.ok : results.skip).push(job.file);
    } catch (error) {
      results.fail.push(`${job.file}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const manifest = mapping
  .map((item) => {
    const slug = slugByName.get(item.name_zh);
    if (!slug) return null;
    const isGymBells = USE_GYMBELLS.has(item.name_zh);
    const cover = isGymBells ? `/exercises/${slug}.png` : `/exercises/${slug}.jpg`;
    return {
      slug,
      nameZh: item.name_zh,
      coverUrl: existsSync(join(OUT_DIR, cover.split("/").pop())) ? cover : null,
      demoUrl: existsSync(join(OUT_DIR, `${slug}.gif`)) ? `/exercises/${slug}.gif` : null,
      mediaCredit: isGymBells ? CREDIT_GYMBELLS : CREDIT_GYMVISUAL,
      source: isGymBells ? "gymbells" : "exercises-dataset",
    };
  })
  .filter(Boolean);

writeFileSync(join(ROOT, "prisma", "seed", "exercise-media.json"), JSON.stringify(manifest, null, 2));

console.log(`\n新增 ${results.ok.length} 个，跳过 ${results.skip.length} 个，失败 ${results.fail.length} 个`);
if (results.fail.length) {
  console.log("失败清单：");
  for (const item of results.fail) console.log("  ✗", item);
}
const withCover = manifest.filter((m) => m.coverUrl).length;
const withDemo = manifest.filter((m) => m.demoUrl).length;
console.log(`素材清单：封面 ${withCover}/${manifest.length}，动图 ${withDemo}/${manifest.length}`);
