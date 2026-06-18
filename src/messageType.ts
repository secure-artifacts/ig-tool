import { SavedVideo } from "@/schema/saved";
import { SettingsSchemaType } from "@/schema/settings";

//  inject 主动发给 background 的消息
export type InjectMessageType = {
  readSettings(): Promise<SettingsSchemaType>;
  //  把一个视频加入「稍后处理」；返回 true=新增，false=已存在
  addSavedVideo(video: SavedVideo): Promise<boolean>;
  //  拉取已收藏的帖子 ID 列表（用于刷新后恢复标签的已存状态）
  readSaved(): Promise<string[]>;
};

//  background 主动推送给 inject 的消息
export type BackgroundMessageType = {
  settingsChanged(settings: SettingsSchemaType): void;
};
