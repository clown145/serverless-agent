import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import { fetchModelsDevModelMetadata } from "./models-dev-metadata-source";
import type { ModelMetadataResolution } from "./model-metadata";

export type ModelMetadataSourceName = "models.dev";

export async function fetchModelMetadata(
  source: ModelMetadataSourceName,
  input: {
    provider: ModelProviderRecord;
    modelIds: string[];
  }
): Promise<Map<string, ModelMetadataResolution>> {
  if (source === "models.dev") {
    return fetchModelsDevModelMetadata(input.provider, input.modelIds);
  }

  return new Map();
}
