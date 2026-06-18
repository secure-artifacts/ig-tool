import { mountDurationBadges } from "./index/badges";
import { startSavedSync } from "./index/savedStore";
import { startSettingsSync } from "./index/settingsStore";
//  注册时声明了 injects/index.css,需 import 这个样式入口让构建产出该文件,
//  否则 chrome.scripting.registerContentScripts 加载 css 会报"無法載入指令碼的 css"
import "./index/index.less";

//  先启动共享同步（设置 + 收藏状态），再挂载功能模块
startSettingsSync();
startSavedSync();
//  在每个视频左上角显示时长徽标；命中表格链接的帖子会在时间后追加绿色对勾
mountDurationBadges();
