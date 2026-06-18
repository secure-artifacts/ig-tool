import { extId } from "@/const";
import { BackgroundMessageType, InjectMessageType } from "@/messageType";
import { MessagesInstance } from "@webextkits/messages-center/inject";

//  注入端唯一的消息实例（多个功能模块共用，避免重复建立连接）。
export const mc = new MessagesInstance<InjectMessageType, BackgroundMessageType>(
  extId,
  true,
);
