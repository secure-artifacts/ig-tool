import {
  extractIgIdsFromCsv,
  MarkSheet,
  toSheetCsvUrl,
} from "@/schema/settings";

export type MarkFetchResult = {
  //  所有命中（含重复）与去重后的 ID
  all: string[];
  unique: string[];
  //  抓取失败的来源描述（无法识别链接 / HTTP 错误 / 网络问题）
  failed: string[];
  //  每个来源各命中多少，便于核对
  perSheet: { label: string; count: number }[];
};

//  抓取所有表格来源、按列提取并合并去重 Instagram ID。
//  纯逻辑、依赖全局 fetch，可在设置页或后台 service worker 中复用。
export async function collectMarkedIds(
  markSheets: MarkSheet[],
): Promise<MarkFetchResult> {
  const all: string[] = [];
  const failed: string[] = [];
  const perSheet: { label: string; count: number }[] = [];

  const valid = markSheets.filter((s) => s.url.trim());
  await Promise.all(
    valid.map(async (s, i) => {
      const label = `表格 ${i + 1}`;
      const csvUrl = toSheetCsvUrl(s.url);
      if (!csvUrl) {
        failed.push(`${label}（无法识别链接）`);
        return;
      }
      try {
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const ids = extractIgIdsFromCsv(text, s.column);
        all.push(...ids);
        perSheet.push({ label, count: ids.length });
      } catch (e) {
        failed.push(`${label}（${(e as Error).message}）`);
      }
    }),
  );

  return { all, unique: [...new Set(all)], failed, perSheet };
}
