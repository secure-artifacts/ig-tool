import packageJson from "../package.json";
import { hostMatches, sheetHostMatches } from "./const";
import { defineManifest } from "@crxjs/vite-plugin";

const { version, description } = packageJson;

const [major, minor, patch] = version.replace(/[^\d.-]+/g, "").split(/[.-]/);

export default defineManifest(async () => ({
  manifest_version: 3,
  name: description,
  description: description,
  version: `${major}.${minor}.${patch}`,
  author: {
    name: "作者名称",
    email: "example@gmail.com",
  },
  //  默认方式 A 用 chrome.sidePanel.open（需 Chrome 116+）；
  //  若只用方式 B（点图标开侧边栏），sidePanel API 最低 114 即可，可下调到 "114"
  minimum_chrome_version: "116",
  version_name: version,
  content_scripts: [
    {
      js: ["src/scopes/content/index.ts"],
      matches: hostMatches,
      run_at: "document_end",
    },
  ],
  background: {
    service_worker: "src/scopes/background/index.ts",
    type: "module",
  },
  //  "sidePanel" 启用侧边栏
  permissions: ["tabs", "scripting", "storage", "sidePanel", "alarms"],
  options_page: "src/scopes/options/index.html",
  //  侧边栏入口
  side_panel: {
    default_path: "src/scopes/sidepanel/index.html",
  },
  action: {
    default_icon: "assets/logo-128.png",
    //  方式 A（默认）：点图标弹 popup，侧边栏由 popup 内按钮 chrome.sidePanel.open 打开
    //  方式 B：移除下面 default_popup，并在 background 启用
    //          chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    //          即可让点击图标直接打开侧边栏
    default_popup: "src/scopes/popup/index.html",
  },
  //  instagram 用于内容脚本注入；docs.google.com / googleusercontent 用于抓取表格 CSV
  host_permissions: [...hostMatches, ...sheetHostMatches],
  icons: {
    "16": "assets/logo-16.png",
    "19": "assets/logo-19.png",
    "32": "assets/logo-32.png",
    "38": "assets/logo-38.png",
    "48": "assets/logo-48.png",
    "128": "assets/logo-128.png",
  },
  web_accessible_resources: [
    {
      resources: ["*"],
      matches: hostMatches,
    },
  ],
  externally_connectable: {
    matches: hostMatches,
  },
}));
