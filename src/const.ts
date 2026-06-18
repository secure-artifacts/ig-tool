export const hostMatches = ["https://www.instagram.com/*"];
//  抓取 Google Sheet CSV 导出所需的主机权限：
//  导出接口在 docs.google.com，公开表会 307 重定向到 *.googleusercontent.com，
//  两个 host 都要授权，fetch 才能跟随重定向读到内容（否则被 CORS 拦）。
export const sheetHostMatches = [
  "https://docs.google.com/*",
  "https://*.googleusercontent.com/*",
];
export const extId = "ig-tool";

//  内容脚本 -> 页面注入脚本 的广播事件名（window.postMessage 的 data.type）。
//  用它把存储变更实时送达 MAIN world，不依赖会被回收的 background service worker。
export const settingsBridgeEvent = "__ig_tool_settings";
//  「稍后处理」收藏 ID 列表的广播事件名（让注入端标签刷新后仍显示已存状态）。
export const savedBridgeEvent = "__ig_tool_saved";
