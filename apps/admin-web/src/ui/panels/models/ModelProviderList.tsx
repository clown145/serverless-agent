import {
  CheckCircle2,
  DatabaseZap,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  TestTube2,
  Trash2
} from "lucide-react";
import type { ModelCapability, ModelCatalogItem, ModelProvider } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";
import { formatModelNumber } from "./modelSelection";

type ModelProviderListProps = {
  providers: ModelProvider[];
  enabledModelsByProvider: Record<string, ModelCatalogItem[]>;
  modelsByProvider: Record<string, ModelCatalogItem[]>;
  activeProviderId: string;
  activeModelId: string;
  onRefresh: (providerId: string) => void;
  onRefreshMetadata: (providerId: string) => void;
  onEdit: (provider: ModelProvider) => void;
  onTest: (providerId: string, modelId?: string) => void;
  onActivate: (providerId: string, modelId: string) => void;
  onCapabilitiesChange: (modelId: string, capabilities: ModelCapability[]) => void;
  onStatusChange: (modelId: string, status: ModelCatalogItem["status"]) => void;
  onDelete: (providerId: string) => void;
  refreshingProviderId?: string;
  refreshingMetadataProviderId?: string;
  testingKey?: string;
};

export function ModelProviderList({
  providers,
  enabledModelsByProvider,
  modelsByProvider,
  activeProviderId,
  activeModelId,
  onRefresh,
  onRefreshMetadata,
  onEdit,
  onTest,
  onActivate,
  onCapabilitiesChange,
  onStatusChange,
  onDelete,
  refreshingProviderId,
  refreshingMetadataProviderId,
  testingKey
}: ModelProviderListProps) {
  const { t } = useI18n();

  return (
    <div className="model-provider-list">
      {providers.map((provider) => {
        const providerModels = modelsByProvider[provider.id] ?? [];
        const enabledModels = enabledModelsByProvider[provider.id] ?? [];
        const hiddenModels = providerModels.filter((model) => model.status !== "enabled");
        const refreshing = refreshingProviderId === provider.id;
        const refreshingMetadata = refreshingMetadataProviderId === provider.id;
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
                disabled={refreshing || refreshingMetadata}
                onClick={() => onRefresh(provider.id)}
              />
              <ToolbarButton
                label={t("models.refreshMetadata")}
                icon={DatabaseZap}
                disabled={refreshing || refreshingMetadata}
                onClick={() => onRefreshMetadata(provider.id)}
              />
              <ToolbarButton
                label={t("models.editProvider")}
                icon={Pencil}
                disabled={refreshing || refreshingMetadata}
                onClick={() => onEdit(provider)}
              />
              <ToolbarButton
                label={t("models.deleteProvider")}
                icon={Trash2}
                variant="danger"
                onClick={() => onDelete(provider.id)}
              />
            </div>
            <div className="model-section-title">
              <span>{t("models.enabledModels")}</span>
              <span>{enabledModels.length}</span>
            </div>
            <div className="model-list">
              {enabledModels.map((model) =>
                renderModelChoice({
                  active: activeProviderId === provider.id && activeModelId === model.modelId,
                  model,
                  onActivate: () => onActivate(provider.id, model.modelId),
                  onCapabilitiesChange,
                  onStatusChange,
                  onTest: () => onTest(provider.id, model.modelId),
                  platformTestingKey: testKey(provider.id, model.modelId),
                  testingKey,
                  t
                })
              )}
              {providerModels.length === 0 && <EmptyState label={t("models.refreshToLoad")} />}
              {providerModels.length > 0 && enabledModels.length === 0 && (
                <EmptyState label={t("models.noEnabledModels")} />
              )}
            </div>
            {hiddenModels.length > 0 && (
              <details className="model-hidden-section">
                <summary>{t("models.otherModels", { count: hiddenModels.length })}</summary>
                <div className="model-list">
                  {hiddenModels.map((model) =>
                    renderModelChoice({
                      active: activeProviderId === provider.id && activeModelId === model.modelId,
                      model,
                      onActivate: () => onActivate(provider.id, model.modelId),
                      onCapabilitiesChange,
                      onStatusChange,
                      onTest: () => onTest(provider.id, model.modelId),
                      platformTestingKey: testKey(provider.id, model.modelId),
                      testingKey,
                      t
                    })
                  )}
                </div>
              </details>
            )}
          </div>
        );
      })}
      {providers.length === 0 && <EmptyState label={t("models.noProviders")} />}
    </div>
  );
}

const MODEL_CAPABILITIES: ModelCapability[] = [
  "tools",
  "vision",
  "long_context",
  "structured_output",
  "reasoning"
];

type RenderModelChoiceInput = {
  active: boolean;
  model: ModelCatalogItem;
  onActivate: () => void;
  onCapabilitiesChange: (modelId: string, capabilities: ModelCapability[]) => void;
  onStatusChange: (modelId: string, status: ModelCatalogItem["status"]) => void;
  onTest: () => void;
  platformTestingKey: string;
  testingKey?: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

function renderModelChoice({
  active,
  model,
  onActivate,
  onCapabilitiesChange,
  onStatusChange,
  onTest,
  platformTestingKey,
  testingKey,
  t
}: RenderModelChoiceInput) {
  const enabled = model.status === "enabled";
  return (
    <div
      key={model.id}
      className={`model-choice ${active ? "selected" : ""} ${enabled ? "" : "muted"}`}
    >
      <button className="model-activate" disabled={!enabled} type="button" onClick={onActivate}>
        <span className="model-name-block">
          <span>{model.displayName ?? model.modelId}</span>
          {(model.contextWindow || model.maxOutputTokens) && (
            <small>
              {model.contextWindow
                ? t("models.contextWindow", { count: formatModelNumber(model.contextWindow) })
                : ""}
              {model.contextWindow && model.maxOutputTokens ? " / " : ""}
              {model.maxOutputTokens
                ? t("models.maxOutputTokens", { count: formatModelNumber(model.maxOutputTokens) })
                : ""}
            </small>
          )}
        </span>
        {active && <CheckCircle2 size={16} />}
      </button>
      <StatusBadge value={model.status} />
      <ToolbarButton
        label={enabled ? t("models.disableModel") : t("models.enableModel")}
        icon={enabled ? PowerOff : Power}
        disabled={model.status === "unavailable"}
        onClick={() => onStatusChange(model.id, enabled ? "disabled" : "enabled")}
      />
      <ToolbarButton
        label={t("models.testModel")}
        icon={TestTube2}
        disabled={testingKey === platformTestingKey}
        onClick={onTest}
      />
      <div className="model-metadata-line">
        {model.metadataSource ? (
          <span>
            {t("models.metadataSource", {
              source: model.metadataSource,
              confidence: model.metadataConfidence ?? "unknown"
            })}
          </span>
        ) : model.capabilitiesSource !== "inferred" ? (
          <span>{t(`models.capabilitiesSource.${model.capabilitiesSource}`)}</span>
        ) : null}
      </div>
      <div className="model-capability-list">
        {MODEL_CAPABILITIES.map((capability) => (
          <label
            className={`model-capability-chip ${
              model.capabilities.includes(capability) ? "selected" : ""
            }`}
            key={capability}
          >
            <input
              checked={model.capabilities.includes(capability)}
              type="checkbox"
              onChange={(event) =>
                onCapabilitiesChange(
                  model.id,
                  toggleCapability(model.capabilities, capability, event.target.checked)
                )
              }
            />
            {t(`models.capability.${capability}`)}
          </label>
        ))}
      </div>
    </div>
  );
}

function toggleCapability(
  capabilities: ModelCapability[],
  capability: ModelCapability,
  enabled: boolean
): ModelCapability[] {
  if (enabled) {
    return MODEL_CAPABILITIES.filter((item) => item === capability || capabilities.includes(item));
  }

  return capabilities.filter((item) => item !== capability);
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
