import { useMessages } from "./hooks/useMessages";
import { extId, hostMatches } from "@/const";
import { SchemaType, schema } from "@/schema/index";
import { injectExtensionData } from "@webextkits/messages-center/hooks";
import { useAutoFillBuckets } from "@webextkits/storage-local";

//  侧边栏打开方式 B（可选）：点击扩展图标直接打开侧边栏
//  启用前需移除 manifest.ts 中 action.default_popup，否则点图标只会弹 popup
//  chrome.sidePanel
//    .setPanelBehavior({ openPanelOnActionClick: true })
//    .catch((e) => console.error(e));

injectExtensionData({
  hostMatch: hostMatches,
  extensionId: extId,
  isDev: import.meta.env.DEV,
});
useAutoFillBuckets<SchemaType>(schema);
useMessages();

chrome.scripting.registerContentScripts([
  {
    id: `inject-${extId}-module`,
    js: ["externals.js", "injects/index.js"],
    css: ["injects/index.css"],
    matches: hostMatches,
    runAt: "document_end",
    //  @ts-ignore
    world: "MAIN",
  },
]);
