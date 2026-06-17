import { ColorRule } from "@/schema/settings";

//  inject 主动发给 background 的消息
export type InjectMessageType = {
  readColorRules(): Promise<ColorRule[]>;
};

//  background 主动推送给 inject 的消息
export type BackgroundMessageType = {
  colorRulesChanged(rules: ColorRule[]): void;
};
