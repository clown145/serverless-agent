import type {
  ModelCatalogRecord,
  ModelProviderRecord,
  ModelSettingsRecord
} from "../storage/repositories/model-settings-types";

export type SetupStepId =
  | "provider"
  | "credential"
  | "models"
  | "active_model";

export type SetupStep = {
  id: SetupStepId;
  label: string;
  status: "done" | "pending";
  detail: string;
};

export type SetupStatus = {
  ready: boolean;
  steps: SetupStep[];
  activeProvider?: string;
  activeModel?: string;
};

export function buildSetupStatus(input: {
  providers: ModelProviderRecord[];
  models: ModelCatalogRecord[];
  settings?: ModelSettingsRecord;
}): SetupStatus {
  const activeProvider = input.providers.find(
    (provider) => provider.id === input.settings?.providerId
  );
  const activeModel = input.models.find(
    (model) =>
      model.providerId === input.settings?.providerId &&
      model.modelId === input.settings?.modelId
  );
  const keyedProviders = input.providers.filter(
    (provider) => provider.credentialId || provider.apiKeySecret
  );
  const steps: SetupStep[] = [
    {
      id: "provider",
      label: "Provider",
      status: input.providers.length ? "done" : "pending",
      detail: input.providers.length
        ? `${input.providers.length} provider configured`
        : "Create a model provider"
    },
    {
      id: "credential",
      label: "API key",
      status: keyedProviders.length ? "done" : "pending",
      detail: keyedProviders.length
        ? `${keyedProviders.length} provider has a key`
        : "Save an API key for a provider"
    },
    {
      id: "models",
      label: "Models",
      status: input.models.length ? "done" : "pending",
      detail: input.models.length
        ? `${input.models.length} models available`
        : "Refresh models from a provider"
    },
    {
      id: "active_model",
      label: "Default model",
      status: activeProvider && activeModel ? "done" : "pending",
      detail: activeProvider && activeModel
        ? `${activeProvider.name} / ${activeModel.displayName ?? activeModel.modelId}`
        : "Select a default model"
    }
  ];

  return {
    ready: steps.every((step) => step.status === "done"),
    steps,
    activeProvider: activeProvider?.name,
    activeModel: activeModel?.displayName ?? activeModel?.modelId
  };
}
