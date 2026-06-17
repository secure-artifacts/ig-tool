import "./index.less";
import { schema, SchemaType } from "@/schema";
import { ColorOp, ColorRule, findRuleConflicts } from "@/schema/settings";
import { useStorageLocal } from "@webextkits/storage-local";
import {
  Button,
  ColorPicker,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";

const { getBucket, setBucket } = useStorageLocal<SchemaType>(schema);

const OP_OPTIONS: { label: string; value: ColorOp }[] = [
  { label: "小于", value: "lt" },
  { label: "大于", value: "gt" },
  { label: "等于", value: "eq" },
  { label: "介于", value: "between" },
];

//  新增规则时的默认值（中性占位，由用户自行设置）
const newRule = (): ColorRule => ({ op: "gt", seconds: 0, color: "#1677ff" });

export function App() {
  const [rules, setRules] = useState<ColorRule[]>([]);

  useEffect(() => {
    getBucket("settings").then((data) => setRules(data.colorRules));
  }, []);

  //  修改某一行的某个字段
  function patch(index: number, patch: Partial<ColorRule>) {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  function remove(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    await setBucket("settings", { colorRules: rules });
    message.success("已保存，规则将实时生效");
  }

  function handleSave() {
    const conflicts = findRuleConflicts(rules);
    if (conflicts.length === 0) {
      save();
      return;
    }

    //  存在时长范围重叠：提示并说明当前按顺序优先生效，让用户决定是否仍要保存
    Modal.confirm({
      title: "存在时间冲突",
      content: (
        <div>
          <p>以下规则的时长范围有重叠，命中时按列表顺序、靠前的规则优先生效：</p>
          <ul style={{ paddingLeft: 20 }}>
            {conflicts.map(([i, j]) => (
              <li key={`${i}-${j}`}>
                规则 {i + 1} 与 规则 {j + 1}
              </li>
            ))}
          </ul>
          <p>仍要保存吗？</p>
        </div>
      ),
      okText: "仍然保存",
      cancelText: "返回修改",
      onOk: save,
    });
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <Typography.Title level={4}>视频时长着色规则</Typography.Title>
      <Typography.Paragraph type={"secondary"}>
        按从上到下的顺序匹配，命中第一条规则即用其颜色；都不命中则为白色。
      </Typography.Paragraph>

      <Space direction={"vertical"} size={12} style={{ width: "100%" }}>
        {rules.map((rule, index) => (
          <Space key={index} size={8} wrap>
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
            <Button danger type={"text"} onClick={() => remove(index)}>
              删除
            </Button>
          </Space>
        ))}

        <Button block onClick={() => setRules((prev) => [...prev, newRule()])}>
          + 添加规则
        </Button>
        <Button type={"primary"} block onClick={handleSave}>
          保存
        </Button>
      </Space>
    </div>
  );
}
