import type { ModelCatalogItem, ModelProvider } from "../../../api/types";

export function modelKey(providerId?: string, modelId?: string): string {
  return providerId && modelId ? `${providerId}::${modelId}` : "";
}

export function parseModelKey(value: string): { providerId?: string; modelId?: string } {
  const [providerId, ...modelParts] = value.split("::");
  const modelId = modelParts.join("::");
  return providerId && modelId ? { providerId, modelId } : {};
}

export function modelLabel(model: ModelCatalogItem, providers: ModelProvider[]): string {
  const provider = providers.find((item) => item.id === model.providerId);
  return `${provider?.name ?? model.providerId} / ${modelDisplayLabel(model)}`;
}

export function modelDisplayLabel(model: ModelCatalogItem): string {
  const metadata = [
    model.contextWindow ? `ctx ${formatModelNumber(model.contextWindow)}` : undefined,
    model.maxOutputTokens ? `out ${formatModelNumber(model.maxOutputTokens)}` : undefined
  ].filter(Boolean);
  const name = model.displayName ?? model.modelId;

  return metadata.length > 0 ? `${name} (${metadata.join(", ")})` : name;
}

export function enabledModelOptions(models: ModelCatalogItem[]): ModelCatalogItem[] {
  return models.filter((model) => model.status === "enabled");
}

export function formatModelNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
