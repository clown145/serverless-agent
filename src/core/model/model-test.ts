import type { Env } from "../../shared/types/env";
import type {
  ModelCatalogRecord,
  ModelProviderRecord,
  ModelSettingsRecord
} from "../../storage/repositories/model-settings-types";
import { createModelProviderFromConfig } from "./provider-factory";
import { resolveModelConfigFromProvider } from "./provider-config";

export type ModelTestResult = {
  providerId: string;
  modelId: string;
  latencyMs: number;
  content?: string;
};

export async function testModelProvider(input: {
  env: Env;
  provider: ModelProviderRecord;
  models: ModelCatalogRecord[];
  settings?: ModelSettingsRecord;
  modelId?: string;
  prompt?: string;
}): Promise<ModelTestResult> {
  const modelId = selectTestModel(input);
  const config = await resolveModelConfigFromProvider(input.env, input.provider, modelId);
  const provider = createModelProviderFromConfig(config);
  const started = Date.now();
  const response = await provider.complete({
    messages: [
      {
        role: "user",
        content: input.prompt?.trim() || "Reply with only: pong"
      }
    ],
    tools: []
  });

  return {
    providerId: input.provider.id,
    modelId,
    latencyMs: Date.now() - started,
    content: response.content
  };
}

function selectTestModel(input: {
  provider: ModelProviderRecord;
  models: ModelCatalogRecord[];
  settings?: ModelSettingsRecord;
  modelId?: string;
}): string {
  if (input.modelId?.trim()) {
    return input.modelId.trim();
  }

  if (input.settings?.providerId === input.provider.id && input.settings.modelId?.trim()) {
    return input.settings.modelId.trim();
  }

  const firstModel = input.models.find((model) => model.providerId === input.provider.id);
  if (firstModel) {
    return firstModel.modelId;
  }

  if (input.provider.providerType === "gemini") {
    return "gemini-2.5-flash";
  }

  if (input.provider.providerType === "mock") {
    return "mock";
  }

  return "gpt-4.1";
}
