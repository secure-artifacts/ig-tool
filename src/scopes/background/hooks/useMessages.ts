import { extId } from "@/const";
import { InjectMessageType, BackgroundMessageType } from "@/messageType";
import { schema, SchemaType } from "@/schema/index";
import { MessageInstance } from "@webextkits/messages-center/background";
import { useStorageLocal } from "@webextkits/storage-local";

const mc = new MessageInstance<InjectMessageType, BackgroundMessageType>(
  extId,
  true,
);

const { getBucket, updateBucket } = useStorageLocal<SchemaType>(schema);

export function useMessages() {
  //  inject 启动时拉取一次设置（着色规则 + 字体大小）
  mc.on("readSettings", async () => {
    return await getBucket("settings");
  });

  //  inject 把视频加入「稍后处理」：按 id 去重后写入 saved 桶，新增的排到最前
  mc.on("addSavedVideo", async (video) => {
    let added = false;
    await updateBucket("saved", (saved) => {
      if (saved.videos.some((v) => v.id === video.id)) return saved;
      added = true;
      return { ...saved, videos: [video, ...saved.videos] };
    });
    return added;
  });

  //  inject 刷新后拉取已收藏 ID，恢复标签的「已存」状态
  mc.on("readSaved", async () => {
    const saved = await getBucket("saved");
    return saved.videos.map((v) => v.id);
  });

  //  设置页保存后，storage 变化 -> 推送最新设置给所有页面的 inject，实时生效
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    //  仅当涉及 settings 的存储项变化时才推送
    const touched = Object.keys(changes).some((key) => key.includes("settings"));
    if (!touched) return;

    const settings = await getBucket("settings");
    mc.send("settingsChanged", settings);
  });
}
