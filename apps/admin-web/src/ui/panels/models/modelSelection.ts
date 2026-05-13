import type { ModelCatalogItem, ModelProvider } from "../../../api/types";

export function modelKey(providerId?: string, modelId?: string): string {
  return providerId && modelId ? `${providerId}::${modelId}` : "";
}

export function parseModelKey(value: string): { providerId?: string; modelId?: string } {
  const [providerId, ...modelParts] = value.split("::");
  const modelId = modelParts.join("::");
  return providerId && modelId ? { providerId, modelId } : {};
}

export function modelLabel(
  model: ModelCatalogItem,
  providers: ModelProvider[]
): string {
  const provider = providers.find((item) => item.id === model.providerId);
  return `${provider?.name ?? model.providerId} / ${model.displayName ?? model.modelId}`;
}

export function enabledModelOptions(models: ModelCatalogItem[]): ModelCatalogItem[] {
  return models.filter((model) => model.status === "enabled");
}
