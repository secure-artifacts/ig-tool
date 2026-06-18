import { SavedSchema, SavedSchemaType } from "./saved";
import { SettingsSchemaType, SettingsSchema } from "./settings";

export type SchemaType = {
  settings: SettingsSchemaType;
  saved: SavedSchemaType;
};

export const schema = {
  settings: SettingsSchema,
  saved: SavedSchema,
};
