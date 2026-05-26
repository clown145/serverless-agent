import type { ToolSettingsRecord } from "../../../storage/repositories/tool-settings-types";

export type ToolSettingsDto = ToolSettingsRecord;

export function toToolSettingsDto(settings: ToolSettingsRecord): ToolSettingsDto {
  return settings;
}
