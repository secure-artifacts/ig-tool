import "./index.less";
import { collectMarkedIds } from "@/markSheets";
import { schema, SchemaType } from "@/schema";
import {
  BADGE_BG,
  ColorOp,
  ColorRule,
  DEFAULT_FONT_SIZE,
  DEFAULT_REFRESH_MINUTES,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  MIN_REFRESH_MINUTES,
  clampFontSize,
  findRuleConflicts,
  formatDurationSec,
  isEnabled,
  isLowContrastOnBadge,
  MarkSheet,
  parseSettings,
  resolveColor,
  SettingsSchemaType,
} from "@/schema/settings";
import { useStorageLocal } from "@webextkits/storage-local";
import {
  Button,
  ColorPicker,
  Divider,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useEffect, useRef, useState } from "react";

const { getBucket, setBucket, updateBucket } =
  useStorageLocal<SchemaType>(schema);

//  比较两个 ID 列表是否一致（忽略顺序），用于避免无谓的状态更新/写入
function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

const OP_OPTIONS: { label: string; value: ColorOp }[] = [
  { label: "小于", value: "lt" },
  { label: "大于", value: "gt" },
  { label: "等于", value: "eq" },
  { label: "介于", value: "between" },
];

//  新增规则时的默认值（中性占位，由用户自行设置）
const newRule = (): ColorRule => ({
  op: "gt",
  seconds: 0,
  color: "#1677ff",
  enabled: true,
});

//  按注入端真实样式渲染的徽标预览（深色背景 + 着色文字），便于直观判断可读性与大小
function BadgePreview({
  color,
  text,
  fontSize,
}: {
  color: string;
  text: string;
  fontSize: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        background: BADGE_BG,
        color,
        padding: "1px 6px",
        borderRadius: 4,
        fontSize,
        lineHeight: 1.4,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

export function App() {
  const [rules, setRules] = useState<ColorRule[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  //  试算预览的输入时长（秒）
  const [previewSeconds, setPreviewSeconds] = useState(60);
  //  徽标字体大小（px），全局生效
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  //  「链接标记」：多个表格来源、从表格提取的命中 ID、抓取中状态
  const [markSheets, setMarkSheets] = useState<MarkSheet[]>([]);
  const [markedIds, setMarkedIds] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  //  后台定时自动刷新开关与间隔（分钟）
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(DEFAULT_REFRESH_MINUTES);

  //  初次加载完成前不触发自动保存，避免用默认值覆盖已存数据
  const loadedRef = useRef(false);

  useEffect(() => {
    getBucket("settings").then((data) => {
      setRules(data.colorRules);
      setFontSize(data.fontSize ?? DEFAULT_FONT_SIZE);
      //  兜底旧结构：确保每条来源都有 url / column 字段
      setMarkSheets(
        (data.markSheets ?? []).map((s) => ({
          url: s.url ?? "",
          column: s.column ?? 0,
        })),
      );
      setMarkedIds(data.markedIds ?? []);
      setAutoRefresh(data.markAutoRefresh ?? false);
      setRefreshMinutes(data.markRefreshMinutes ?? DEFAULT_REFRESH_MINUTES);
      loadedRef.current = true;
    });
  }, []);

  //  自动保存「本页拥有的字段」：防抖 400ms，用 updateBucket 原子合并，
  //  保留 storage 里最新的 markedIds（后台自动刷新可能已更新），避免互相覆盖。
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      updateBucket("settings", (s) => ({
        ...s,
        colorRules: rules,
        fontSize,
        markSheets,
        markAutoRefresh: autoRefresh,
        markRefreshMinutes: refreshMinutes,
      })).catch((e) => {
        /* eslint-disable-next-line no-console */
        console.error("[settings] 自动保存失败:", e);
        message.error(`自动保存失败：${(e as Error).message}`);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [rules, fontSize, markSheets, autoRefresh, refreshMinutes]);

  //  监听存储变化：后台自动刷新更新 markedIds 后，实时同步回页面显示。
  useEffect(() => {
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== "local") return;
      const newValue = changes.settings?.newValue as
        | SettingsSchemaType
        | undefined;
      const next = newValue?.markedIds;
      if (next) setMarkedIds((prev) => (sameIds(prev, next) ? prev : next));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  //  markedIds 由「抓取/清空/导入」单独写入并即时持久化
  async function persistMarkedIds(ids: string[]) {
    setMarkedIds(ids);
    try {
      await updateBucket("settings", (s) => ({ ...s, markedIds: ids }));
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error("[settings] 保存匹配结果失败:", e);
      message.error(`保存失败：${(e as Error).message}`);
    }
  }

  //  修改某一行的某个字段
  function patch(index: number, patch: Partial<ColorRule>) {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  function remove(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  //  导出：把当前规则、字体大小与链接标记配置复制为配置文本到剪贴板
  async function handleExport() {
    const text = JSON.stringify(
      {
        colorRules: rules,
        fontSize,
        markSheets,
        markedIds,
        markAutoRefresh: autoRefresh,
        markRefreshMinutes: refreshMinutes,
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(text);
      message.success("配置已复制到剪贴板");
    } catch {
      message.error("复制失败，请检查浏览器剪贴板权限");
    }
  }

  //  导入：整份配置替换并即时持久化生效
  async function applyImport(parsed: SettingsSchemaType) {
    setRules(parsed.colorRules);
    setFontSize(parsed.fontSize);
    setMarkSheets(parsed.markSheets);
    setMarkedIds(parsed.markedIds);
    setAutoRefresh(parsed.markAutoRefresh);
    setRefreshMinutes(parsed.markRefreshMinutes);
    setImportOpen(false);
    setImportText("");
    try {
      await setBucket("settings", { ...parsed });
      message.success("已导入并生效");
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error("[settings] 导入保存失败:", e);
      message.error(`导入保存失败：${(e as Error).message}`);
    }
  }

  //  导入：解析粘贴的配置文本并替换当前全部配置
  function handleImportConfirm() {
    let parsed: SettingsSchemaType;
    try {
      parsed = parseSettings(importText);
    } catch (e) {
      message.error(`导入失败：${(e as Error).message}`);
      return;
    }

    //  当前已有规则时，覆盖前二次确认；空列表则直接导入、不打扰
    if (rules.length === 0) {
      applyImport(parsed);
      return;
    }

    Modal.confirm({
      title: "导入将替换当前配置",
      content: `导入会用新配置替换当前的 ${rules.length} 条规则及字体大小，是否继续？`,
      okText: "替换",
      cancelText: "取消",
      onOk: () => applyImport(parsed),
    });
  }

  //  修改某个表格来源的字段
  function patchSheet(index: number, patch: Partial<MarkSheet>) {
    setMarkSheets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  //  抓取所有表格来源：链接转成 CSV 地址 -> 拉取 -> 按列提取 ID -> 合并去重
  async function handleFetchSheets() {
    if (markSheets.every((s) => !s.url.trim())) {
      message.error("请至少填写一个表格链接");
      return;
    }

    setFetching(true);
    try {
      const { all, unique, failed, perSheet } =
        await collectMarkedIds(markSheets);
      await persistMarkedIds(unique);

      //  调试输出：每表命中数与去重后 ID，便于人工核对
      /* eslint-disable no-console */
      console.log("[link-mark] 抓取结果:", {
        perSheet,
        failed,
        total: all.length,
        unique,
      });
      /* eslint-enable no-console */

      if (failed.length > 0) {
        message.warning(
          `部分表格抓取失败：${failed.join("、")}。请确认已设为「知道链接的任何人可查看」`,
        );
      }
      if (all.length === 0) {
        message.warning("未从表格中找到任何 Instagram 链接");
      } else {
        //  分别报「总数 / 去重后」，并列出每张表的命中数，便于核对差异
        const detail = perSheet.map((p) => `${p.label}: ${p.count}`).join("，");
        message.success(
          `共 ${all.length} 个链接（去重后 ${unique.length} 个）。各表：${detail}。已自动保存生效`,
        );
      }
    } finally {
      setFetching(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <Typography.Title level={4}>视频时长着色规则</Typography.Title>
      <Typography.Paragraph type={"secondary"}>
        按从上到下的顺序匹配，命中第一条规则即用其颜色；都不命中则为白色。
      </Typography.Paragraph>

      <Space direction={"vertical"} size={12} style={{ width: "100%" }}>
        {rules.map((rule, index) => (
          //  开关固定在左侧顶端，控件组占满剩余宽度并在自身内部换行，
          //  避免行变长时把前面的开关挤到下一行
          <div
            key={index}
            style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}
          >
            <Tooltip title={isEnabled(rule) ? "已启用，点击停用" : "已停用，点击启用"}>
              <Switch
                size={"small"}
                style={{ marginTop: 4 }}
                checked={isEnabled(rule)}
                onChange={(enabled) => patch(index, { enabled })}
              />
            </Tooltip>
            {/*  停用的规则整行淡化，但仍可编辑/删除  */}
            <Space
              size={8}
              wrap
              style={{ flex: 1, opacity: isEnabled(rule) ? 1 : 0.45 }}
            >
              <span>时长</span>
              <Select<ColorOp>
                style={{ width: 90 }}
                value={rule.op}
                options={OP_OPTIONS}
                onChange={(op) =>
                  patch(index, {
                    op,
                    //  切到“介于”时若还没有上界，默认用下界占位
                    ...(op === "between" && rule.secondsMax == null
                      ? { secondsMax: rule.seconds }
                      : {}),
                  })
                }
              />
              <InputNumber
                style={{ width: 110 }}
                min={0}
                value={rule.seconds}
                addonAfter={"秒"}
                onChange={(seconds) => patch(index, { seconds: seconds ?? 0 })}
              />
              {rule.op === "between" && (
                <>
                  <span>至</span>
                  <InputNumber
                    style={{ width: 110 }}
                    min={0}
                    value={rule.secondsMax ?? null}
                    addonAfter={"秒"}
                    onChange={(secondsMax) =>
                      patch(index, { secondsMax: secondsMax ?? 0 })
                    }
                  />
                </>
              )}
              <span>显示为</span>
              <ColorPicker
                value={rule.color}
                onChange={(color) =>
                  patch(index, { color: color.toHexString() })
                }
              />
              {isLowContrastOnBadge(rule.color) && (
                <Tooltip title={"该颜色较深，在深色徽标背景上可能看不清"}>
                  <Typography.Text type={"warning"}>⚠</Typography.Text>
                </Tooltip>
              )}
              <Button danger type={"text"} onClick={() => remove(index)}>
                删除
              </Button>
            </Space>
          </div>
        ))}

        <Button block onClick={() => setRules((prev) => [...prev, newRule()])}>
          + 添加规则
        </Button>

        {/*  时长范围重叠时被动提示（不阻断自动保存）：靠前规则优先生效  */}
        {findRuleConflicts(rules).length > 0 && (
          <Typography.Text type={"warning"} style={{ fontSize: 12 }}>
            注意：
            {findRuleConflicts(rules)
              .map(([i, j]) => `规则${i + 1}与规则${j + 1}`)
              .join("、")}
            的时长范围有重叠，命中时按列表顺序、靠前的规则优先生效。
          </Typography.Text>
        )}

        {/*  徽标字体大小：全局生效  */}
        <Space wrap size={8} align={"center"}>
          <span>徽标字体大小</span>
          <InputNumber
            style={{ width: 110 }}
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={fontSize}
            addonAfter={"px"}
            onChange={(v) => setFontSize(clampFontSize(v ?? DEFAULT_FONT_SIZE))}
          />
          <Typography.Text type={"secondary"}>
            （{MIN_FONT_SIZE}–{MAX_FONT_SIZE}）
          </Typography.Text>
          {fontSize !== DEFAULT_FONT_SIZE && (
            <Button
              type={"link"}
              style={{ padding: 0 }}
              onClick={() => setFontSize(DEFAULT_FONT_SIZE)}
            >
              恢复默认
            </Button>
          )}
        </Space>

        {/*  试算：输入一个时长，实时看命中哪条规则、最终徽标长什么样  */}
        <Space
          wrap
          size={8}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#fafafa",
            borderRadius: 8,
          }}
        >
          <span>试算</span>
          <InputNumber
            style={{ width: 110 }}
            min={0}
            value={previewSeconds}
            addonAfter={"秒"}
            onChange={(v) => setPreviewSeconds(v ?? 0)}
          />
          <span>效果</span>
          <BadgePreview
            color={resolveColor(rules, previewSeconds).color}
            text={formatDurationSec(previewSeconds)}
            fontSize={fontSize}
          />
          <Typography.Text type={"secondary"}>
            {(() => {
              const i = resolveColor(rules, previewSeconds).index;
              return i >= 0 ? `命中规则 ${i + 1}` : "未命中（白色）";
            })()}
          </Typography.Text>
        </Space>

        <Divider style={{ margin: "4px 0" }} />

        {/*  链接标记：从多个 Google Sheet 抓取链接，命中的帖子在页面上加角标  */}
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          链接标记
        </Typography.Title>
        <Typography.Paragraph type={"secondary"} style={{ marginBottom: 0 }}>
          粘贴 Google Sheet 链接（含 #gid，自动定位到对应工作表），并指定链接所在列；列填
          0 则扫描整表。抓取其中的 Instagram 链接（按帖子 ID 匹配），命中的帖子会在时间徽标后面显示
          绿色对勾。表格需设为「知道链接的任何人可查看」。
        </Typography.Paragraph>

        {markSheets.map((sheet, index) => (
          <Space key={index} size={8} wrap>
            <Input
              style={{ width: 300 }}
              value={sheet.url}
              placeholder={"https://docs.google.com/spreadsheets/d/.../edit#gid=0"}
              onChange={(e) => patchSheet(index, { url: e.target.value })}
            />
            <Tooltip title={"链接所在列（1 起）；0 = 扫描整表所有列"}>
              <InputNumber
                style={{ width: 110 }}
                min={0}
                value={sheet.column}
                addonBefore={"第"}
                addonAfter={"列"}
                onChange={(v) => patchSheet(index, { column: v ?? 0 })}
              />
            </Tooltip>
            <Button
              danger
              type={"text"}
              onClick={() =>
                setMarkSheets((prev) => prev.filter((_, i) => i !== index))
              }
            >
              删除
            </Button>
          </Space>
        ))}

        <Space size={8} wrap>
          <Button
            onClick={() =>
              setMarkSheets((prev) => [...prev, { url: "", column: 0 }])
            }
          >
            + 添加表格
          </Button>
          <Button
            type={"primary"}
            loading={fetching}
            onClick={handleFetchSheets}
            disabled={markSheets.every((s) => !s.url.trim())}
          >
            抓取并解析
          </Button>
        </Space>

        <Space size={8} wrap>
          <Typography.Text type={"secondary"}>
            {markedIds.length > 0
              ? `当前已匹配 ${markedIds.length} 个链接`
              : "尚未匹配任何链接"}
          </Typography.Text>
          {markedIds.length > 0 && (
            <Button
              type={"link"}
              danger
              style={{ padding: 0 }}
              onClick={() => persistMarkedIds([])}
            >
              清空
            </Button>
          )}
        </Space>

        {/*  后台定时自动刷新：由 background 按间隔轮询表格并推送更新  */}
        <Space size={8} wrap align={"center"}>
          <Switch checked={autoRefresh} onChange={setAutoRefresh} />
          <span>后台自动刷新</span>
          <Tooltip title={`每隔一段时间自动重新抓取表格（最低 ${MIN_REFRESH_MINUTES} 分钟）`}>
            <InputNumber
              style={{ width: 120 }}
              min={MIN_REFRESH_MINUTES}
              disabled={!autoRefresh}
              value={refreshMinutes}
              addonBefore={"每"}
              addonAfter={"分钟"}
              onChange={(v) =>
                setRefreshMinutes(Math.max(MIN_REFRESH_MINUTES, v ?? DEFAULT_REFRESH_MINUTES))
              }
            />
          </Tooltip>
        </Space>
        <Typography.Text type={"secondary"} style={{ fontSize: 12 }}>
          注：Google 表格不支持即时推送，开启后由扩展按上述间隔轮询，变化会自动更新到页面。
        </Typography.Text>

        <Divider style={{ margin: "4px 0" }} />

        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Button block onClick={handleExport}>
            导出配置
          </Button>
          <Button
            block
            onClick={() => {
              setImportText("");
              setImportOpen(true);
            }}
          >
            导入配置
          </Button>
        </Space>
      </Space>

      <Modal
        title={"导入配置"}
        open={importOpen}
        onOk={handleImportConfirm}
        onCancel={() => setImportOpen(false)}
        okText={"导入"}
        cancelText={"取消"}
      >
        <Typography.Paragraph type={"secondary"}>
          粘贴此前导出的配置文本，导入后将替换当前全部配置并立即生效。
        </Typography.Paragraph>
        <Input.TextArea
          rows={10}
          value={importText}
          placeholder={"在此粘贴配置文本…"}
          onChange={(e) => setImportText(e.target.value)}
        />
      </Modal>
    </div>
  );
}
