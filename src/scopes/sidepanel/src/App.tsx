import { schema, SchemaType } from "@/schema";
import { SavedVideo } from "@/schema/saved";
import { formatDurationSec } from "@/schema/settings";
import { useStorageLocal } from "@webextkits/storage-local";
import {
  Button,
  Empty,
  List,
  Popconfirm,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";

const { getBucket, updateBucket } = useStorageLocal<SchemaType>(schema);

export function App() {
  const [videos, setVideos] = useState<SavedVideo[]>([]);

  useEffect(() => {
    getBucket("saved").then((d) => setVideos(d.videos));
    //  注入端新增或本面板删除后，实时同步列表
    const listener = (
      changes: { [k: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== "local") return;
      const next = changes.saved?.newValue as SchemaType["saved"] | undefined;
      if (next) setVideos(next.videos ?? []);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  async function removeOne(id: string) {
    await updateBucket("saved", (s) => ({
      ...s,
      videos: s.videos.filter((v) => v.id !== id),
    }));
  }

  async function clearAll() {
    await updateBucket("saved", (s) => ({ ...s, videos: [] }));
  }

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      message.success(okMsg);
    } catch {
      message.error("复制失败，请检查剪贴板权限");
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <Space
        style={{ width: "100%", justifyContent: "space-between" }}
        align={"center"}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          稍后处理（{videos.length}）
        </Typography.Title>
        {videos.length > 0 && (
          <Space size={4}>
            <Button
              size={"small"}
              type={"text"}
              onClick={() =>
                copyText(
                  videos.map((v) => v.url).join("\n"),
                  `已复制 ${videos.length} 条链接`,
                )
              }
            >
              复制全部
            </Button>
            <Popconfirm
              title={"清空全部收藏？"}
              okText={"清空"}
              cancelText={"取消"}
              onConfirm={clearAll}
            >
              <Button size={"small"} danger type={"text"}>
                清空
              </Button>
            </Popconfirm>
          </Space>
        )}
      </Space>

      {videos.length === 0 ? (
        <Empty
          style={{ marginTop: 48 }}
          description={"还没有收藏。把鼠标移到视频上，点「＋ 稍后」即可加入。"}
        />
      ) : (
        <List
          style={{ marginTop: 8 }}
          dataSource={videos}
          renderItem={(v) => (
            <List.Item
              key={v.id}
              actions={[
                <Button
                  key={"copy"}
                  size={"small"}
                  type={"text"}
                  onClick={() => copyText(v.url, "已复制链接")}
                >
                  复制
                </Button>,
                <Button
                  key={"del"}
                  size={"small"}
                  danger
                  type={"text"}
                  onClick={() => removeOne(v.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={""}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 6,
                        background: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                        fontSize: 12,
                      }}
                    >
                      {formatDurationSec(v.duration ?? NaN)}
                    </div>
                  )
                }
                title={
                  <a href={v.url} target={"_blank"} rel={"noreferrer"}>
                    {v.id}
                  </a>
                }
                description={
                  <Typography.Text type={"secondary"} style={{ fontSize: 12 }}>
                    时长 {formatDurationSec(v.duration ?? NaN)} ·{" "}
                    {new Date(v.addedAt).toLocaleString()}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
