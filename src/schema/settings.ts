import { JSONSchemaType } from "@webextkits/storage-local";

//  比较运算符：小于 / 大于 / 等于 / 范围（介于）
export type ColorOp = "lt" | "gt" | "eq" | "between";

//  一条着色规则：当视频时长（秒）满足条件时使用 color。
//  - lt/gt/eq：与 seconds 比较；
//  - between：介于 [seconds, secondsMax] 闭区间内。
export type ColorRule = {
  op: ColorOp;
  seconds: number;
  secondsMax?: number | null;
  color: string;
};

export type SettingsSchemaType = {
  colorRules: ColorRule[];
};

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

//  返回所有时长范围重叠的规则下标对（[i, j]，i < j）
export function findRuleConflicts(rules: ColorRule[]): [number, number][] {
  const intervals = rules.map(intervalOf);
  const conflicts: [number, number][] = [];
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
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
        },
        required: ["op", "seconds", "color"],
      },
    },
  },
  default: {},
  required: ["colorRules"],
};
