import { SavedVideo } from "@/schema/saved";
import { mc } from "./mc";
import { postIdForVideo } from "./postId";
import { isSaved, markSavedLocally, onSavedChange } from "./savedStore";

const PILL_ATTR = "data-ig-later-pill";
const PID_ATTR = "data-ig-pid";

type PillEl = HTMLSpanElement & { _video?: HTMLVideoElement };

function renderPill(pill: HTMLElement, saved: boolean) {
  pill.textContent = saved ? "✓ 已存" : "＋ 稍后";
  pill.style.background = saved ? "#52c41a" : "rgba(255, 255, 255, 0.22)";
}

function buildSavedVideo(video: HTMLVideoElement, id: string): SavedVideo {
  return {
    id,
    //  /p/<id>/ 对帖子与 Reel 都可打开（IG 会自动跳转）
    url: `https://www.instagram.com/p/${id}/`,
    duration: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
    thumbnail: video.poster || null,
    addedAt: Date.now(),
  };
}

async function activate(pill: PillEl) {
  const id = pill.getAttribute(PID_ATTR);
  const video = pill._video;
  if (!id || !video || isSaved(id)) return;
  //  乐观更新：立即置为已存（同时刷新同帖子的其它标签）
  markSavedLocally(id);
  try {
    await mc.send("addSavedVideo", buildSavedVideo(video, id));
  } catch {
    //  发送失败保持原状，用户可重试
  }
}

//  收藏状态变化（本地乐观更新 / 存储广播）时，刷新页面上所有标签的显示
function refreshAllPills() {
  document.querySelectorAll<PillEl>(`[${PILL_ATTR}]`).forEach((pill) => {
    const id = pill.getAttribute(PID_ATTR);
    if (id) renderPill(pill, isSaved(id));
  });
}

//  按坐标命中当前所有「稍后」标签（几何判断，不受 IG 覆盖层/层叠影响）
function hitPill(x: number, y: number): PillEl | null {
  const pills = document.querySelectorAll<PillEl>(`[${PILL_ATTR}]`);
  for (const pill of pills) {
    const r = pill.getBoundingClientRect();
    if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return pill;
    }
  }
  return null;
}

let installed = false;
function installGlobalInterceptor() {
  if (installed) return;
  installed = true;

  //  收藏集合变化时统一刷新所有标签状态
  onSavedChange(refreshAllPills);

  //  捕获阶段在 document 上最先触发，抢在 IG 的链接跳转/事件处理之前拦截：
  //  press 阶段先吞掉（避免触发播放/拖拽等），click 时执行保存。
  const block = (e: MouseEvent | PointerEvent) => {
    if (hitPill(e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  document.addEventListener("pointerdown", block, true);
  document.addEventListener("mousedown", block, true);
  document.addEventListener(
    "click",
    (e) => {
      const pill = hitPill(e.clientX, e.clientY);
      if (!pill) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      void activate(pill);
    },
    true,
  );
}

//  在时长徽标末尾（时间/对勾之后）追加「稍后处理」小标签。
//  徽标每次刷新会清空重建，这里随之重新追加；点击交互由全局捕获拦截器统一处理。
export function appendLaterPill(badge: HTMLElement, video: HTMLVideoElement) {
  const id = postIdForVideo(video);
  if (!id) return;
  installGlobalInterceptor();

  const pill = document.createElement("span") as PillEl;
  pill.setAttribute(PILL_ATTR, "");
  pill.setAttribute(PID_ATTR, id);
  pill._video = video;
  Object.assign(pill.style, {
    marginLeft: "6px",
    padding: "0 6px",
    borderRadius: "4px",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    pointerEvents: "auto",
  } as Partial<CSSStyleDeclaration>);
  renderPill(pill, isSaved(id));
  badge.appendChild(pill);
}
