import {
  BADGE_DEFAULT_COLOR,
  ColorRule,
  DEFAULT_FONT_SIZE,
  resolveColor,
} from "@/schema/settings";
import { appendLaterPill } from "./laterButton";
import { postIdForVideo } from "./postId";
import { onSettings } from "./settingsStore";
import { formatDuration } from "./videos";

const BADGE_ATTR = "data-ig-duration-badge";
const DEFAULT_COLOR = BADGE_DEFAULT_COLOR;

//  徽标距容器顶部的偏移：首页(根路径)左上角有用户头像 logo,需下移避开;
//  其他页面无遮挡,保持贴顶 8px
const HOME_TOP = "44px";
const DEFAULT_TOP = "8px";
function badgeTop(): string {
  return location.pathname === "/" ? HOME_TOP : DEFAULT_TOP;
}

//  已挂载监听的 video（用于规则变化时批量刷新颜色）
const tracked = new Set<HTMLVideoElement>();
//  来自设置页的着色规则
let colorRules: ColorRule[] = [];
//  来自设置页的徽标字体大小（px）
let fontSize = DEFAULT_FONT_SIZE;
//  来自表格、需要打勾标记的帖子 ID 集合
let markedIds = new Set<string>();

//  按规则顺序返回首个命中（且启用）规则的颜色，未命中用默认白色
function colorFor(duration: number): string {
  return resolveColor(colorRules, duration).color;
}

//  在 video 父容器左上角创建/获取时长徽标
function ensureBadge(video: HTMLVideoElement): HTMLElement | null {
  const parent = video.parentElement;
  if (!parent) return null;

  //  父容器需为定位元素，徽标才能相对其左上角绝对定位
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }
  //  关键：让父容器自成一个层叠上下文，把徽标“关”在容器内。
  //  否则 position:absolute 的徽标会归属到根层叠上下文，按 DOM 顺序
  //  绘制到 Instagram 固定导航之上（导航在 DOM 中更靠前）。
  //  容器本身是绘制在导航之下的（视频不会盖住导航），隔离后徽标随之被压到导航下方。
  parent.style.isolation = "isolate";

  let badge = parent.querySelector<HTMLElement>(`:scope > [${BADGE_ATTR}]`);
  if (!badge) {
    badge = document.createElement("div");
    badge.setAttribute(BADGE_ATTR, "");
    Object.assign(badge.style, {
      position: "absolute",
      left: "8px",
      top: badgeTop(),
      padding: "1px 6px",
      borderRadius: "4px",
      background: "rgba(0, 0, 0, 0.75)",
      color: DEFAULT_COLOR,
      fontSize: `${fontSize}px`,
      //  用无单位行高，字体变化时高度随之缩放
      lineHeight: "1.4",
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
      pointerEvents: "none",
      userSelect: "none",
    } as Partial<CSSStyleDeclaration>);
    parent.appendChild(badge);
  }
  return badge;
}

//  刷新单个 video 的徽标文案与颜色
function updateBadge(video: HTMLVideoElement) {
  const badge = ensureBadge(video);
  if (!badge) return;

  const { duration } = video;
  //  textContent 会清空原有子节点，需在此之后再追加对勾
  badge.textContent = formatDuration(duration);
  badge.style.color = colorFor(duration);
  //  字体大小可能在设置页被调整，每次刷新时同步
  badge.style.fontSize = `${fontSize}px`;
  //  SPA 切换首页/其他页面时同步顶部偏移
  badge.style.top = badgeTop();

  //  命中表格链接的帖子，在时间后面追加一个绿底白勾的小标签，醒目可辨
  const id = markedIds.size > 0 ? postIdForVideo(video) : null;
  if (id && markedIds.has(id)) {
    const check = document.createElement("span");
    check.textContent = "✓";
    Object.assign(check.style, {
      marginLeft: "5px",
      padding: "0 5px",
      borderRadius: "4px",
      background: "#52c41a",
      color: "#fff",
      fontWeight: "700",
    } as Partial<CSSStyleDeclaration>);
    badge.appendChild(check);
  }

  //  时间（及对勾）之后追加「稍后处理」小标签
  appendLaterPill(badge, video);
}

//  规则变化后，重新着色所有仍在页面中的视频徽标
function refreshAll() {
  for (const video of tracked) {
    if (!video.isConnected) {
      tracked.delete(video);
      continue;
    }
    updateBadge(video);
  }
}

//  绑定单个 video：立即显示一次，时长就绪/变化时再刷新
function track(video: HTMLVideoElement) {
  if (tracked.has(video)) return;
  tracked.add(video);

  updateBadge(video);
  //  duration 在元数据未加载时为 NaN（先显示 --:--），就绪后更新
  video.addEventListener("loadedmetadata", () => updateBadge(video));
  //  视频源被复用/切换时时长会变（Instagram 会回收 video 元素）
  video.addEventListener("durationchange", () => updateBadge(video));
}

//  自动为页面内所有 video 在左上角挂载时长徽标，并跟随 SPA 动态内容
export function mountDurationBadges(): () => void {
  let scheduled = false;
  const scan = () => {
    scheduled = false;
    document
      .querySelectorAll("video")
      .forEach((v) => track(v as HTMLVideoElement));
  };

  //  合并同一帧内的多次 DOM 变化，避免频繁全量扫描
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  };

  //  订阅共享设置：着色规则 / 字体大小 / 命中标记变化时实时重绘
  onSettings((settings) => {
    colorRules = settings.colorRules ?? [];
    fontSize = settings.fontSize ?? DEFAULT_FONT_SIZE;
    markedIds = new Set(settings.markedIds ?? []);
    refreshAll();
  });

  scan();

  //  Instagram 是 SPA，视频会动态加载/回收，监听 DOM 变化
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}
