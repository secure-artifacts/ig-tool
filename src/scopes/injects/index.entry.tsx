import { mountDurationBadges } from "./index/badges";
//  注册时声明了 injects/index.css,需 import 这个样式入口让构建产出该文件,
//  否则 chrome.scripting.registerContentScripts 加载 css 会报"無法載入指令碼的 css"
import "./index/index.less";

//  默认在每个视频左上角显示时长徽标
mountDurationBadges();
