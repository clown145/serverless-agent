import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ModelCapability,
  ModelCatalogItem,
  ModelProvider,
  ModelTestResult
} from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { ToolbarButton } from "../ToolbarButton";
import { DefaultModelPicker } from "./models/DefaultModelPicker";
import { ModelProviderForm } from "./models/ModelProviderForm";
import { ModelProviderList } from "./models/ModelProviderList";
import { providerDraftDefaults, type ModelProviderDraft } from "./models/modelDefaults";
import type { PanelProps } from "./types";

export function ModelsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [activeModelId, setActiveModelId] = useState("");
  const [testResult, setTestResult] = useState<ModelTestResult>();
  const [testingKey, setTestingKey] = useState("");
  const [refreshingProviderId, setRefreshingProviderId] = useState("");
  const [refreshingMetadataProviderId, setRefreshingMetadataProviderId] = useState("");
  const [draft, setDraft] = useState<ModelProviderDraft>(providerDraftDefaults("openai"));

  const modelsByProvider = useMemo(() => {
    return models.reduce<Record<string, ModelCatalogItem[]>>((grouped, model) => {
      grouped[model.providerId] = [...(grouped[model.providerId] ?? []), model];
      return grouped;
    }, {});
  }, [models]);

  const enabledModels = useMemo(
    () => models.filter((model) => model.status === "enabled"),
    [models]
  );

  const enabledModelsByProvider = useMemo(() => {
    return enabledModels.reduce<Record<string, ModelCatalogItem[]>>((grouped, model) => {
      grouped[model.providerId] = [...(grouped[model.providerId] ?? []), model];
      return grouped;
    }, {});
  }, [enabledModels]);

  async function load() {
    try {
      const result = await client.getModelSettings();
      setProviders(result.providers);
      setModels(result.models);
      setActiveProviderId(result.settings?.providerId ?? "");
      setActiveModelId(result.settings?.modelId ?? "");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load models", "error");
    }
  }

  async function createProvider() {
    try {
      await client.createModelProvider({
        name: draft.name,
        providerType: draft.providerType,
        baseUrl: draft.baseUrl || undefined,
        apiKey: draft.apiKey || undefined,
        authType: draft.authType,
        authHeader: draft.authHeader || undefined,
        authQueryParam: draft.authQueryParam || undefined,
        modelListStrategy: draft.modelListStrategy,
        chatProtocol: draft.chatProtocol
      });
      notify(t("models.providerCreated"), "ok");
      setDraft({ ...draft, apiKey: "" });
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create provider", "error");
    }
  }

  async function refresh(providerId: string) {
    setRefreshingProviderId(providerId);
    try {
      const result = await client.refreshProviderModels(providerId);
      setModels(result.models);
      notify(
        result.metadataError
          ? `${t("models.modelsRefreshed")} / ${result.metadataError}`
          : t("models.modelsRefreshed"),
        result.metadataError ? "error" : "ok"
      );
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to refresh models", "error");
    } finally {
      setRefreshingProviderId("");
    }
  }

  async function refreshMetadata(providerId: string) {
    setRefreshingMetadataProviderId(providerId);
    try {
      const result = await client.refreshProviderModelMetadata(providerId);
      setModels(result.models);
      notify(t("models.metadataRefreshed", { count: result.matched }), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to refresh metadata", "error");
    } finally {
      setRefreshingMetadataProviderId("");
    }
  }

  async function test(providerId: string, modelId?: string) {
    const key = `${providerId}:${modelId ?? ""}`;
    setTestingKey(key);
    try {
      const result = await client.testProviderModel(providerId, { modelId });
      setTestResult(result.result);
      notify(t("models.modelReplied", { latency: result.result.latencyMs }), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to test model", "error");
    } finally {
      setTestingKey("");
    }
  }

  async function activate(providerId: string, modelId: string) {
    try {
      await client.activateModel({ providerId, modelId });
      notify(t("models.modelActivated"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to activate model", "error");
    }
  }

  async function updateCapabilities(modelCatalogId: string, capabilities: ModelCapability[]) {
    try {
      const result = await client.updateModelCapabilities(modelCatalogId, capabilities);
      setModels((current) =>
        current.map((model) => model.id === result.model.id ? result.model : model)
      );
      notify(t("models.capabilitiesSaved"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to update capabilities", "error");
    }
  }

  async function updateStatus(modelCatalogId: string, status: ModelCatalogItem["status"]) {
    try {
      const result = await client.updateModelStatus(modelCatalogId, status);
      setModels((current) =>
        current.map((model) => model.id === result.model.id ? result.model : model)
      );
      notify(status === "enabled" ? t("models.modelEnabled") : t("models.modelDisabled"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to update model status", "error");
    }
  }

  async function removeProvider(providerId: string) {
    try {
      await client.deleteModelProvider(providerId);
      notify(t("models.providerDeleted"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete provider", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("models.title")}</h1>
          <p>
            {activeModelId
              ? `${activeProviderId} / ${activeModelId}`
              : t("models.mockFallback")}
          </p>
          <span>{t("models.enabledCount", { count: enabledModels.length })}</span>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <ModelProviderForm
        draft={draft}
        onDraftChange={setDraft}
        onProviderTypeChange={(providerType) => setDraft(providerDraftDefaults(providerType))}
        onSubmit={() => void createProvider()}
      />

      <DefaultModelPicker
        activeProviderId={activeProviderId}
        activeModelId={activeModelId}
        models={enabledModels}
        providers={providers}
        onActivate={(providerId, modelId) => void activate(providerId, modelId)}
      />

      {testResult && (
        <div className="model-test-result">
          <strong>{t("models.lastTest")}</strong>
          <span>
            {testResult.providerId} / {testResult.modelId} / {testResult.latencyMs}ms
          </span>
          <pre className="json-block">{testResult.content ?? t("models.noTextResponse")}</pre>
        </div>
      )}

      <ModelProviderList
        providers={providers}
        enabledModelsByProvider={enabledModelsByProvider}
        modelsByProvider={modelsByProvider}
        activeProviderId={activeProviderId}
        activeModelId={activeModelId}
        onRefresh={(providerId) => void refresh(providerId)}
        onRefreshMetadata={(providerId) => void refreshMetadata(providerId)}
        onTest={(providerId, modelId) => void test(providerId, modelId)}
        onActivate={(providerId, modelId) => void activate(providerId, modelId)}
        onCapabilitiesChange={(modelId, capabilities) =>
          void updateCapabilities(modelId, capabilities)
        }
        onStatusChange={(modelId, status) => void updateStatus(modelId, status)}
        onDelete={(providerId) => void removeProvider(providerId)}
        refreshingProviderId={refreshingProviderId}
        refreshingMetadataProviderId={refreshingMetadataProviderId}
        testingKey={testingKey}
      />
    </section>
  );
}
