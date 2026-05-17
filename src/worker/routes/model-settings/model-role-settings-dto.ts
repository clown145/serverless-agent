import type { ModelRole, ModelRoleSettingRecord } from "../../../storage/repositories/model-settings-types";

export type ModelRoleSettingsDto = Partial<Record<ModelRole, {
  providerId?: string;
  modelId?: string;
}>>;

export function toModelRoleSettingsDto(settings: ModelRoleSettingRecord[]): ModelRoleSettingsDto {
  return settings.reduce<ModelRoleSettingsDto>((roles, setting) => {
    roles[setting.role] = {
      providerId: setting.providerId,
      modelId: setting.modelId
    };
    return roles;
  }, {});
}
