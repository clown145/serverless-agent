import type { ModelCapability, ModelRole } from "../../../api/types";

export type ModelRoleDefinition = {
  role: ModelRole;
  labelKey: string;
  descriptionKey: string;
  preferredCapability?: ModelCapability;
  allowEmpty: boolean;
};

export const MODEL_ROLE_DEFINITIONS: ModelRoleDefinition[] = [
  {
    role: "default",
    labelKey: "modelConfig.role.default",
    descriptionKey: "modelConfig.role.defaultHint",
    allowEmpty: false
  },
  {
    role: "summary",
    labelKey: "modelConfig.role.summary",
    descriptionKey: "modelConfig.role.summaryHint",
    allowEmpty: true
  },
  {
    role: "vision",
    labelKey: "modelConfig.role.vision",
    descriptionKey: "modelConfig.role.visionHint",
    preferredCapability: "vision",
    allowEmpty: true
  }
];
