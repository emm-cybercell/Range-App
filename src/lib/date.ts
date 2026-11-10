/** 业务日期统一用 YYYY-MM-DD（用户本地时区），存库时转成 UTC 零点 */

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * 读取当前毫秒时间戳。
 * 集中放在工具层，避免在组件渲染作用域里内联调用时钟读取。
 */
export function nowMs(): number {
  return Date.now();
}
