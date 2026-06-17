//  将秒数格式化为 mm:ss，未知返回 "--:--"
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--:--";

  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
