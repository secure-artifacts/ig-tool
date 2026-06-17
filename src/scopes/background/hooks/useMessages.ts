import { extId } from "@/const";
import { InjectMessageType, BackgroundMessageType } from "@/messageType";
import { schema, SchemaType } from "@/schema/index";
import { MessageInstance } from "@webextkits/messages-center/background";
import { useStorageLocal } from "@webextkits/storage-local";

const mc = new MessageInstance<InjectMessageType, BackgroundMessageType>(
  extId,
  true,
);

const { getBucket } = useStorageLocal<SchemaType>(schema);

export function useMessages() {
  //  inject 启动时拉取一次着色规则
  mc.on("readColorRules", async () => {
    const settings = await getBucket("settings");
    return settings.colorRules;
  });

  //  设置页保存后，storage 变化 -> 推送最新规则给所有页面的 inject，实时生效
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    //  仅当涉及 settings 的存储项变化时才推送
    const touched = Object.keys(changes).some((key) => key.includes("settings"));
    if (!touched) return;

    const settings = await getBucket("settings");
    mc.send("colorRulesChanged", settings.colorRules);
  });
}
