import { JSONSchemaType } from "@webextkits/storage-local";

//  一条「稍后处理」收藏：浏览时先存起来，回头在侧边栏细看。
export type SavedVideo = {
  //  帖子/Reel 短码（唯一标识，用于去重）
  id: string;
  //  帖子永久链接
  url: string;
  //  视频时长（秒）；未知为 null
  duration?: number | null;
  //  视频封面图（video.poster），可能为空
  thumbnail?: string | null;
  //  加入时间（毫秒时间戳）
  addedAt: number;
};

export type SavedSchemaType = {
  videos: SavedVideo[];
};

export const SavedSchema: JSONSchemaType<SavedSchemaType> = {
  type: "object",
  properties: {
    videos: {
      type: "array",
      default: [],
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string" },
          duration: { type: "number", nullable: true },
          thumbnail: { type: "string", nullable: true },
          addedAt: { type: "number" },
        },
        required: ["id", "url", "addedAt"],
      },
    },
  },
  default: {},
  required: ["videos"],
};
