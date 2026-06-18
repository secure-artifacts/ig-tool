import { extractInstagramId } from "@/schema/settings";

//  找到 video 所属帖子的 ID，依次尝试：
//  1) 祖先链接（个人主页网格场景）；
//  2) 当前页面地址（单帖/单 reel 页：主视频外层没有链接包裹，但 URL 即该帖子；
//     extractInstagramId 在信息流/主页等非帖子路径上返回 null，不会误伤）；
//  3) 所在 article 内的帖子永久链接（信息流场景）。
export function postIdForVideo(video: HTMLVideoElement): string | null {
  for (let el = video.parentElement; el; el = el.parentElement) {
    if (el instanceof HTMLAnchorElement) {
      const id = extractInstagramId(el.getAttribute("href") ?? "");
      if (id) return id;
    }
  }

  const pageId = extractInstagramId(location.pathname);
  if (pageId) return pageId;

  const article = video.closest("article");
  const link = article?.querySelector<HTMLAnchorElement>(
    "a[href*='/p/'], a[href*='/reel/'], a[href*='/reels/'], a[href*='/tv/']",
  );
  return link ? extractInstagramId(link.getAttribute("href") ?? "") : null;
}
