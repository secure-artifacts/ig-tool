import { extId, savedBridgeEvent, settingsBridgeEvent } from "@/const";
import { SavedVideo } from "@/schema/saved";
import { useMessageBridgeContentScript } from "@webextkits/messages-center/contentScript";

useMessageBridgeContentScript(extId);

//  内容脚本可访问 chrome.storage 且随标签页常驻，监听存储变更后直接 postMessage 给
//  同标签页内 MAIN world 的注入脚本——绕开会被回收、内存中 tab 列表会丢失的 background
//  service worker 推送，从而无需刷新页面即可让更新实时生效。
function broadcastSettings(settings: unknown) {
  if (settings) window.postMessage({ type: settingsBridgeEvent, settings }, "*");
}
function broadcastSaved(saved: { videos?: SavedVideo[] } | undefined) {
  const ids = saved?.videos?.map((v) => v.id) ?? [];
  window.postMessage({ type: savedBridgeEvent, ids }, "*");
}

chrome.storage.local.get(["settings", "saved"]).then((r) => {
  broadcastSettings(r.settings);
  broadcastSaved(r.saved as { videos?: SavedVideo[] } | undefined);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.settings?.newValue) broadcastSettings(changes.settings.newValue);
  if (changes.saved?.newValue) broadcastSaved(changes.saved.newValue);
});
