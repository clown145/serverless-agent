import { CheckCircle2, RefreshCw, TestTube2, Trash2 } from "lucide-react";
import type { ModelCatalogItem, ModelProvider } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type ModelProviderListProps = {
  providers: ModelProvider[];
  modelsByProvider: Record<string, ModelCatalogItem[]>;
  activeProviderId: string;
  activeModelId: string;
  onRefresh: (providerId: string) => void;
  onTest: (providerId: string, modelId?: string) => void;
  onActivate: (providerId: string, modelId: string) => void;
  onDelete: (providerId: string) => void;
  testingKey?: string;
};

export function ModelProviderList({
  providers,
  modelsByProvider,
  activeProviderId,
  activeModelId,
  onRefresh,
  onTest,
  onActivate,
  onDelete,
  testingKey
}: ModelProviderListProps) {
  const { t } = useI18n();

  return (
    <div className="model-provider-list">
      {providers.map((provider) => {
        const providerModels = modelsByProvider[provider.id] ?? [];
        return (
          <div className="model-provider-row" key={provider.id}>
            <div className="model-provider-head">
              <div>
                <strong>{provider.name}</strong>
                <span>
                  {provider.providerType} / {credentialLabel(provider, t)}
                </span>
                {provider.baseUrl && <span>{provider.baseUrl}</span>}
              </div>
              <StatusBadge value={provider.status} />
              <ToolbarButton
                label={t("models.testProvider")}
                icon={TestTube2}
                disabled={testingKey === testKey(provider.id)}
                onClick={() => onTest(provider.id)}
              />
              <ToolbarButton
                label={t("models.refreshModels")}
                icon={RefreshCw}
                onClick={() => onRefresh(provider.id)}
              />
              <ToolbarButton
                label={t("models.deleteProvider")}
                icon={Trash2}
                variant="danger"
                onClick={() => onDelete(provider.id)}
              />
            </div>
            <div className="model-list">
              {providerModels.map((model) => {
                const active = activeProviderId === provider.id && activeModelId === model.modelId;
                return (
                  <div
                    key={model.id}
                    className={`model-choice ${active ? "selected" : ""}`}
                  >
                    <button
                      className="model-activate"
                      type="button"
                      onClick={() => onActivate(provider.id, model.modelId)}
                    >
                      <span>{model.displayName ?? model.modelId}</span>
                      {active && <CheckCircle2 size={16} />}
                    </button>
                    <ToolbarButton
                      label={t("models.testModel")}
                      icon={TestTube2}
                      disabled={testingKey === testKey(provider.id, model.modelId)}
                      onClick={() => onTest(provider.id, model.modelId)}
                    />
                  </div>
                );
              })}
              {providerModels.length === 0 && <EmptyState label={t("models.refreshToLoad")} />}
            </div>
          </div>
        );
      })}
      {providers.length === 0 && <EmptyState label={t("models.noProviders")} />}
    </div>
  );
}

function testKey(providerId: string, modelId = ""): string {
  return `${providerId}:${modelId}`;
}

function credentialLabel(
  provider: ModelProvider,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (provider.hasCredential) {
    return t("common.encryptedKey");
  }

  if (provider.apiKeySecret) {
    return `legacy binding: ${provider.apiKeySecret}`;
  }

  return t("common.noKey");
}
