import { CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import type { ModelCatalogItem, ModelProvider } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type ModelProviderListProps = {
  providers: ModelProvider[];
  modelsByProvider: Record<string, ModelCatalogItem[]>;
  activeProviderId: string;
  activeModelId: string;
  onRefresh: (providerId: string) => void;
  onActivate: (providerId: string, modelId: string) => void;
  onDelete: (providerId: string) => void;
};

export function ModelProviderList({
  providers,
  modelsByProvider,
  activeProviderId,
  activeModelId,
  onRefresh,
  onActivate,
  onDelete
}: ModelProviderListProps) {
  return (
    <div className="model-provider-list">
      {providers.map((provider) => {
        const providerModels = modelsByProvider[provider.id] ?? [];
        return (
          <div className="model-provider-row" key={provider.id}>
            <div className="model-provider-head">
              <div>
                <strong>{provider.name}</strong>
                <span>{provider.providerType} / {provider.apiKeySecret}</span>
              </div>
              <StatusBadge value={provider.status} />
              <ToolbarButton
                label="Refresh models"
                icon={RefreshCw}
                onClick={() => onRefresh(provider.id)}
              />
              <ToolbarButton
                label="Delete provider"
                icon={Trash2}
                variant="danger"
                onClick={() => onDelete(provider.id)}
              />
            </div>
            <div className="model-list">
              {providerModels.map((model) => {
                const active = activeProviderId === provider.id && activeModelId === model.modelId;
                return (
                  <button
                    key={model.id}
                    className={`model-choice ${active ? "selected" : ""}`}
                    type="button"
                    onClick={() => onActivate(provider.id, model.modelId)}
                  >
                    <span>{model.displayName ?? model.modelId}</span>
                    {active && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
              {providerModels.length === 0 && <EmptyState label="Refresh to load models" />}
            </div>
          </div>
        );
      })}
      {providers.length === 0 && <EmptyState label="No providers" />}
    </div>
  );
}
