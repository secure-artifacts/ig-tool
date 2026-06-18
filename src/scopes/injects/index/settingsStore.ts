import { settingsBridgeEvent } from "@/const";
import { SettingsSchemaType } from "@/schema/settings";
import { mc } from "./mc";

//  注入端共享的设置源：拉取一次初始设置，并监听设置页的实时变更，
//  让时长徽标、链接标记等多个模块共用同一份数据与同一条消息通道。

type Listener = (settings: SettingsSchemaType) => void;

const listeners = new Set<Listener>();
let current: SettingsSchemaType | null = null;

function emit(settings: SettingsSchemaType) {
  current = settings;
  listeners.forEach((fn) => fn(settings));
}

//  订阅设置变更；若已有当前值会立即回调一次，便于初始化。
export function onSettings(fn: Listener): void {
  listeners.add(fn);
  if (current) fn(current);
}

let started = false;

//  启动同步：拉取初始设置并监听后续更新（幂等，重复调用无副作用）。
export function startSettingsSync(): void {
  if (started) return;
  started = true;

  //  主路径：内容脚本经 window.postMessage 实时广播的设置（不依赖 background SW，
  //  后台定时刷新写入存储后也能立即送达，无需刷新页面）。
  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source !== window) return;
    const data = e.data as { type?: string; settings?: SettingsSchemaType };
    if (data?.type === settingsBridgeEvent && data.settings) emit(data.settings);
  });

  //  初次拉取一次（页面加载时 background 连接可用），保证首屏即有数据；
  //  settingsChanged 作为 SW 存活时的备用推送路径。
  mc.send("readSettings")
    .then((settings) => settings && emit(settings))
    .catch(() => {});
  mc.on("settingsChanged", (settings) => settings && emit(settings));
}
