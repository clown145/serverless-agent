import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import { fetchOpenRouterModelMetadata } from "./openrouter-metadata-source";
import type { ModelMetadataResolution } from "./model-metadata";

export type ModelMetadataSourceName = "openrouter";

export async function fetchModelMetadata(
  source: ModelMetadataSourceName,
  input: {
    provider: ModelProviderRecord;
    modelIds: string[];
  }
): Promise<Map<string, ModelMetadataResolution>> {
  if (source === "openrouter") {
    return fetchOpenRouterModelMetadata(input.provider, input.modelIds);
  }

  return new Map();
}
