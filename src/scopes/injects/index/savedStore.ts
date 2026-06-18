import { savedBridgeEvent } from "@/const";
import { mc } from "./mc";

//  注入端持有的「已收藏帖子 ID」集合，供「稍后」标签判断显示「＋稍后 / ✓已存」。
let savedIds = new Set<string>();
const listeners = new Set<() => void>();

export function isSaved(id: string): boolean {
  return savedIds.has(id);
}

//  乐观更新：点击后先本地标记，无需等存储回传，标签即时变「已存」
export function markSavedLocally(id: string): void {
  if (savedIds.has(id)) return;
  savedIds.add(id);
  listeners.forEach((fn) => fn());
}

export function onSavedChange(fn: () => void): void {
  listeners.add(fn);
}

function apply(ids: string[]) {
  savedIds = new Set(ids);
  listeners.forEach((fn) => fn());
}

let started = false;
export function startSavedSync(): void {
  if (started) return;
  started = true;

  //  实时更新：内容脚本广播的收藏 ID（新增/删除都会同步回页面）
  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source !== window) return;
    const data = e.data as { type?: string; ids?: string[] };
    if (data?.type === savedBridgeEvent && Array.isArray(data.ids)) {
      apply(data.ids);
    }
  });

  //  初次拉取一次，保证刷新后立即恢复已存状态（不必等广播时机）
  mc.send("readSaved")
    .then((ids) => ids && apply(ids))
    .catch(() => {});
}
