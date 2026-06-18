import { JSONSchemaType } from "@webextkits/storage-local";

//  比较运算符：小于 / 大于 / 等于 / 范围（介于）
export type ColorOp = "lt" | "gt" | "eq" | "between";

//  一条着色规则：当视频时长（秒）满足条件时使用 color。
//  - lt/gt/eq：与 seconds 比较；
//  - between：介于 [seconds, secondsMax] 闭区间内。
//  - enabled：是否启用；缺省（旧数据）视为启用。
export type ColorRule = {
  op: ColorOp;
  seconds: number;
  secondsMax?: number | null;
  color: string;
  enabled?: boolean;
};

//  「链接标记」的一个表格来源：
//  - url：粘贴的 Google Sheet 链接（含 #gid=，用于定位具体工作表）；
//  - column：链接所在列（1 起；0 表示整表扫描所有单元格）。
export type MarkSheet = {
  url: string;
  column: number;
};

export type SettingsSchemaType = {
  colorRules: ColorRule[];
  //  徽标文字大小（px），全局生效
  fontSize: number;
  //  「链接标记」的多个表格来源（用于一键刷新重新抓取）
  markSheets: MarkSheet[];
  //  从各表格链接里提取并合并去重的 Instagram 帖子/Reel ID，命中即在页面打角标
  markedIds: string[];
  //  是否后台定时自动重新抓取表格
  markAutoRefresh: boolean;
  //  自动抓取间隔（分钟，最低 1）
  markRefreshMinutes: number;
};

//  自动抓取间隔的默认值与下限（chrome.alarms 最小周期为 1 分钟）
export const DEFAULT_REFRESH_MINUTES = 5;
export const MIN_REFRESH_MINUTES = 1;

//  从 Instagram 帖子/Reel 链接里提取 shortcode（ID）；兼容 p / reel / reels / tv，
//  以及带不带域名、带不带查询参数的写法。提取不到返回 null。
export function extractInstagramId(url: string): string | null {
  const m = /(?:^|\/)(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url);
  return m ? m[1] : null;
}

//  从一段文本（CSV/TSV 原文）中提取所有 Instagram 链接的 ID，按出现顺序返回（含重复）。
//  限定 instagram.com 主机，避免把其它含 /p、/tv、/reel 路径段的链接误判进来。
//  去重由调用方决定，以便分别统计「总数」与「去重后数量」。
export function extractIgIdsFromText(text: string): string[] {
  const re = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/gi;
  const ids: string[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) ids.push(m[1]);
  return ids;
}

//  解析 CSV 文本为二维数组，处理引号包裹、字段内逗号与换行、转义的双引号("")。
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let started = false; //  本行是否已有内容（用于区分末尾空行）

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    started = true;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      started = false;
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (started || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

//  从 CSV 文本提取 Instagram ID：column<1 时整表扫描，否则只看指定列（1 起）。
export function extractIgIdsFromCsv(text: string, column: number): string[] {
  if (!column || column < 1) return extractIgIdsFromText(text);
  const cells = parseCsv(text)
    .map((r) => r[column - 1] ?? "")
    .join("\n");
  return extractIgIdsFromText(cells);
}

//  从 Google Sheet 链接（或裸 ID）构造 CSV 导出地址；解析不出 ID 返回 null。
//  通过链接里的 #gid=<GID> 定位具体工作表，无需手填工作表名称。
//   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
//    -> https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
export function toSheetCsvUrl(sheetUrl: string): string | null {
  const trimmed = sheetUrl.trim();
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  const id = m ? m[1] : /^[a-zA-Z0-9-_]+$/.test(trimmed) ? trimmed : null;
  if (!id) return null;
  const gid = /[#&?]gid=(\d+)/.exec(trimmed);
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  return gid ? `${base}&gid=${gid[1]}` : base;
}

//  徽标背景（半透明黑）与未命中时的默认文字色；注入端与设置页预览共用，避免分叉。
export const BADGE_BG = "rgba(0, 0, 0, 0.75)";
export const BADGE_DEFAULT_COLOR = "#fff";

//  徽标字体大小（px）的默认值与可调范围
export const DEFAULT_FONT_SIZE = 12;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 32;

//  把任意数值收敛到合法的字体大小范围（取整并夹紧）
export function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(n)));
}

//  规则是否启用：未显式设为 false 即启用（兼容历史数据）。
export function isEnabled(rule: ColorRule): boolean {
  return rule.enabled !== false;
}

//  单条规则的命中判断（与注入端逻辑保持一致）。
export function matchRule(rule: ColorRule, duration: number): boolean {
  switch (rule.op) {
    case "lt":
      return duration < rule.seconds;
    case "gt":
      return duration > rule.seconds;
    case "eq":
      return Math.floor(duration) === rule.seconds;
    case "between":
      return (
        rule.secondsMax != null &&
        duration >= rule.seconds &&
        duration <= rule.secondsMax
      );
  }
}

//  按顺序返回首个命中的启用规则下标与颜色；未命中返回 index = -1、默认白色。
export function resolveColor(
  rules: ColorRule[],
  duration: number,
): { index: number; color: string } {
  if (!Number.isFinite(duration))
    return { index: -1, color: BADGE_DEFAULT_COLOR };
  for (let i = 0; i < rules.length; i++) {
    if (isEnabled(rules[i]) && matchRule(rules[i], duration))
      return { index: i, color: rules[i].color };
  }
  return { index: -1, color: BADGE_DEFAULT_COLOR };
}

//  把秒数格式化为 m:ss / h:mm:ss，未就绪时回退为 --:--
export function formatDurationSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "--:--";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

//  文字色的相对亮度（WCAG 线性化），用于判断在深色徽标背景上的可读性。
function relativeLuminance(color: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})/i.exec(color.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const chan = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  const lin = (u: number) =>
    u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(chan(0)) + 0.7152 * lin(chan(2)) + 0.0722 * lin(chan(4));
}

//  徽标背景近似纯黑，文字色过暗时在其上几乎不可读 —— 用于设置页给出提醒。
export function isLowContrastOnBadge(color: string): boolean {
  const l = relativeLuminance(color);
  return l != null && l < 0.12;
}

//  把一条规则映射成它覆盖的时长区间（秒），含端点开闭信息
type Interval = { lo: number; loIncl: boolean; hi: number; hiIncl: boolean };

function intervalOf(rule: ColorRule): Interval {
  switch (rule.op) {
    case "lt":
      return { lo: 0, loIncl: true, hi: rule.seconds, hiIncl: false };
    case "gt":
      return { lo: rule.seconds, loIncl: false, hi: Infinity, hiIncl: false };
    case "eq":
      return { lo: rule.seconds, loIncl: true, hi: rule.seconds, hiIncl: true };
    case "between": {
      const other = rule.secondsMax ?? rule.seconds;
      return {
        lo: Math.min(rule.seconds, other),
        loIncl: true,
        hi: Math.max(rule.seconds, other),
        hiIncl: true,
      };
    }
  }
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  if (a.hi < b.lo || b.hi < a.lo) return false;
  //  仅在端点相接时，两端都为闭区间才算重叠
  if (a.hi === b.lo && !(a.hiIncl && b.loIncl)) return false;
  if (b.hi === a.lo && !(b.hiIncl && a.loIncl)) return false;
  return true;
}

const OPS: ColorOp[] = ["lt", "gt", "eq", "between"];

//  校验一个未知值是否为合法的规则数组，逐条给出不合法原因。
function validateColorRules(list: unknown): ColorRule[] {
  if (!Array.isArray(list)) throw new Error("配置内容应为规则数组");

  return list.map((raw, i) => {
    const at = `第 ${i + 1} 条规则`;
    if (!raw || typeof raw !== "object") throw new Error(`${at}格式不正确`);
    const r = raw as Record<string, unknown>;

    if (!OPS.includes(r.op as ColorOp)) throw new Error(`${at}的运算符不合法`);
    if (typeof r.seconds !== "number" || !Number.isFinite(r.seconds))
      throw new Error(`${at}的秒数不合法`);
    if (typeof r.color !== "string" || !r.color)
      throw new Error(`${at}的颜色不合法`);
    if (
      r.op === "between" &&
      r.secondsMax != null &&
      (typeof r.secondsMax !== "number" || !Number.isFinite(r.secondsMax))
    )
      throw new Error(`${at}的上界秒数不合法`);
    if (r.enabled != null && typeof r.enabled !== "boolean")
      throw new Error(`${at}的启用状态不合法`);

    const rule: ColorRule = {
      op: r.op as ColorOp,
      seconds: r.seconds,
      color: r.color,
    };
    if (r.op === "between") rule.secondsMax = (r.secondsMax as number) ?? null;
    if (r.enabled != null) rule.enabled = r.enabled as boolean;
    return rule;
  });
}

//  把导入的配置文本解析成完整设置；不合法时抛出带原因的错误。
//  兼容三种格式：{ colorRules, fontSize }、{ colorRules } 以及裸的规则数组。
export function parseSettings(text: string): SettingsSchemaType {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("不是有效的 JSON 文本");
  }

  const wrapped =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { colorRules: data };

  const colorRules = validateColorRules(wrapped.colorRules);

  let fontSize = DEFAULT_FONT_SIZE;
  if (wrapped.fontSize != null) {
    if (typeof wrapped.fontSize !== "number" || !Number.isFinite(wrapped.fontSize))
      throw new Error("字体大小不合法");
    fontSize = clampFontSize(wrapped.fontSize);
  }

  let markSheets: MarkSheet[] = [];
  if (wrapped.markSheets != null) {
    if (!Array.isArray(wrapped.markSheets))
      throw new Error("表格来源列表不合法");
    markSheets = wrapped.markSheets.map((raw, i) => {
      const s = raw as Record<string, unknown>;
      if (
        !s ||
        typeof s !== "object" ||
        typeof s.url !== "string" ||
        typeof s.column !== "number" ||
        !Number.isFinite(s.column)
      )
        throw new Error(`第 ${i + 1} 个表格来源不合法`);
      return { url: s.url, column: s.column };
    });
  }

  let markedIds: string[] = [];
  if (wrapped.markedIds != null) {
    if (
      !Array.isArray(wrapped.markedIds) ||
      wrapped.markedIds.some((x) => typeof x !== "string")
    )
      throw new Error("标记 ID 列表不合法");
    markedIds = wrapped.markedIds as string[];
  }

  let markAutoRefresh = false;
  if (wrapped.markAutoRefresh != null) {
    if (typeof wrapped.markAutoRefresh !== "boolean")
      throw new Error("自动刷新开关不合法");
    markAutoRefresh = wrapped.markAutoRefresh;
  }

  let markRefreshMinutes = DEFAULT_REFRESH_MINUTES;
  if (wrapped.markRefreshMinutes != null) {
    if (
      typeof wrapped.markRefreshMinutes !== "number" ||
      !Number.isFinite(wrapped.markRefreshMinutes)
    )
      throw new Error("自动刷新间隔不合法");
    markRefreshMinutes = Math.max(
      MIN_REFRESH_MINUTES,
      Math.round(wrapped.markRefreshMinutes),
    );
  }

  return {
    colorRules,
    fontSize,
    markSheets,
    markedIds,
    markAutoRefresh,
    markRefreshMinutes,
  };
}

//  返回所有时长范围重叠的规则下标对（[i, j]，i < j）；已禁用的规则不参与冲突判断
export function findRuleConflicts(rules: ColorRule[]): [number, number][] {
  const intervals = rules.map(intervalOf);
  const conflicts: [number, number][] = [];
  for (let i = 0; i < intervals.length; i++) {
    if (!isEnabled(rules[i])) continue;
    for (let j = i + 1; j < intervals.length; j++) {
      if (!isEnabled(rules[j])) continue;
      if (intervalsOverlap(intervals[i], intervals[j])) conflicts.push([i, j]);
    }
  }
  return conflicts;
}

export const SettingsSchema: JSONSchemaType<SettingsSchemaType> = {
  type: "object",
  properties: {
    colorRules: {
      type: "array",
      default: [],
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["lt", "gt", "eq", "between"] },
          seconds: { type: "number" },
          secondsMax: { type: "number", nullable: true },
          color: { type: "string" },
          enabled: { type: "boolean", nullable: true },
        },
        required: ["op", "seconds", "color"],
      },
    },
    fontSize: { type: "number", default: DEFAULT_FONT_SIZE },
    markSheets: {
      type: "array",
      default: [],
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          column: { type: "number" },
        },
        required: ["url", "column"],
      },
    },
    markedIds: {
      type: "array",
      default: [],
      items: { type: "string" },
    },
    markAutoRefresh: { type: "boolean", default: false },
    markRefreshMinutes: { type: "number", default: DEFAULT_REFRESH_MINUTES },
  },
  default: {},
  required: [
    "colorRules",
    "fontSize",
    "markSheets",
    "markedIds",
    "markAutoRefresh",
    "markRefreshMinutes",
  ],
};
