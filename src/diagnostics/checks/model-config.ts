import { getModelSettings } from "../../storage/repositories/agent-model-settings-repository";
import { listModelCatalog } from "../../storage/repositories/model-catalog-repository";
import { listModelProviders } from "../../storage/repositories/model-providers-repository";
import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import type { Env } from "../../shared/types/env";
import { diagnosticError, diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

export async function checkModelConfig(
  env: Env,
  agentId: string
): Promise<DiagnosticCheck[]> {
  const [providers, models, settings] = await Promise.all([
    listModelProviders(env.AGENT_DB),
    listModelCatalog(env.AGENT_DB),
    getModelSettings(env.AGENT_DB, agentId)
  ]);
  const activeProviders = providers.filter((provider) => provider.status === "active");
  const configuredProviders = activeProviders.filter(
    (provider) => provider.authType === "none" || providerCredentialAvailable(env, provider)
  );
  const activeProvider = activeProviders.find(
    (provider) => provider.id === settings?.providerId
  );
  const activeModel = models.find(
    (model) =>
      model.providerId === settings?.providerId && model.modelId === settings?.modelId
  );
  const envModelProvider = Boolean(
    env.MODEL_PROVIDER === "mock" ||
      env.OPENAI_API_KEY ||
      env.GEMINI_API_KEY ||
      env.MODEL_NAME
  );

  return [
    modelProvidersCheck(activeProviders.length, envModelProvider),
    modelCredentialsCheck(configuredProviders.length, envModelProvider),
    modelCatalogCheck(models.length),
    activeModelCheck({
      envModelProvider,
      providerName: activeProvider?.name,
      modelName: activeModel?.displayName ?? activeModel?.modelId,
      configuredModelId: settings?.modelId
    })
  ];
}

function providerCredentialAvailable(env: Env, provider: ModelProviderRecord): boolean {
  if (provider.credentialId) {
    return true;
  }

  const secretName = provider.apiKeySecret || legacySecretName(provider.providerType);
  return Boolean((env as unknown as Record<string, string | undefined>)[secretName]);
}

function legacySecretName(type: ModelProviderRecord["providerType"]): string {
  if (type === "openai") {
    return "OPENAI_API_KEY";
  }

  if (type === "gemini") {
    return "GEMINI_API_KEY";
  }

  return "MODEL_API_KEY";
}

function modelProvidersCheck(count: number, envModelProvider: boolean): DiagnosticCheck {
  if (count) {
    return diagnosticOk("model", "model_providers", "Model providers", `${count} active provider(s)`);
  }

  return envModelProvider
    ? diagnosticWarn(
        "model",
        "model_providers",
        "Model providers",
        "No WebUI model provider configured; using environment fallback",
        "Create a model provider in WebUI for easier changes"
      )
    : diagnosticError(
        "model",
        "model_providers",
        "Model providers",
        "No model provider configured",
        "Create a model provider"
      );
}

function modelCredentialsCheck(count: number, envModelProvider: boolean): DiagnosticCheck {
  if (count) {
    return diagnosticOk(
      "model",
      "model_credentials",
      "Model credentials",
      `${count} provider(s) have credentials or no auth`
    );
  }

  return envModelProvider
    ? diagnosticOk(
        "model",
        "model_credentials",
        "Model credentials",
        "Environment model credentials available"
      )
    : diagnosticError(
        "model",
        "model_credentials",
        "Model credentials",
        "No model API key found",
        "Save an API key on a model provider"
      );
}

function modelCatalogCheck(count: number): DiagnosticCheck {
  return count
    ? diagnosticOk("model", "model_catalog", "Model catalog", `${count} model(s) cached`)
    : diagnosticWarn(
        "model",
        "model_catalog",
        "Model catalog",
        "No cached models",
        "Refresh models after creating a provider"
      );
}

function activeModelCheck(input: {
  envModelProvider: boolean;
  providerName?: string;
  modelName?: string;
  configuredModelId?: string;
}): DiagnosticCheck {
  if (input.providerName && input.modelName) {
    return diagnosticOk(
      "model",
      "active_model",
      "Active model",
      `${input.providerName} / ${input.modelName}`
    );
  }

  if (input.providerName && input.configuredModelId) {
    return diagnosticWarn(
      "model",
      "active_model",
      "Active model",
      `${input.providerName} / ${input.configuredModelId} is selected but missing from cached catalog`,
      "Refresh models for the active provider"
    );
  }

  return input.envModelProvider
    ? diagnosticWarn(
        "model",
        "active_model",
        "Active model",
        "No WebUI active model; environment fallback will be used",
        "Select a default model"
      )
    : diagnosticError(
        "model",
        "active_model",
        "Active model",
        "No default model selected",
        "Select a default model"
      );
}
