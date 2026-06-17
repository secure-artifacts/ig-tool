import { SettingsSchemaType, SettingsSchema } from "./settings";

export type SchemaType = {
  settings: SettingsSchemaType;
};

export const schema = {
  settings: SettingsSchema,
};
