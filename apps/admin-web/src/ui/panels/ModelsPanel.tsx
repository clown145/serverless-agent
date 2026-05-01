import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModelCatalogItem, ModelProvider } from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { ModelProviderForm } from "./models/ModelProviderForm";
import { ModelProviderList } from "./models/ModelProviderList";
import { providerDraftDefaults, type ModelProviderDraft } from "./models/modelDefaults";
import type { PanelProps } from "./types";

export function ModelsPanel({ client, notify }: PanelProps) {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [activeModelId, setActiveModelId] = useState("");
  const [draft, setDraft] = useState<ModelProviderDraft>(providerDraftDefaults("openai"));

  const modelsByProvider = useMemo(() => {
    return models.reduce<Record<string, ModelCatalogItem[]>>((grouped, model) => {
      grouped[model.providerId] = [...(grouped[model.providerId] ?? []), model];
      return grouped;
    }, {});
  }, [models]);

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
      notify("Provider created", "ok");
      setDraft({ ...draft, apiKey: "" });
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create provider", "error");
    }
  }

  async function refresh(providerId: string) {
    try {
      await client.refreshProviderModels(providerId);
      notify("Models refreshed", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to refresh models", "error");
    }
  }

  async function activate(providerId: string, modelId: string) {
    try {
      await client.activateModel({ providerId, modelId });
      notify("Model activated", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to activate model", "error");
    }
  }

  async function removeProvider(providerId: string) {
    try {
      await client.deleteModelProvider(providerId);
      notify("Provider deleted", "ok");
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
          <h1>Models</h1>
          <p>{activeModelId ? `${activeProviderId} / ${activeModelId}` : "mock fallback"}</p>
        </div>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <ModelProviderForm
        draft={draft}
        onDraftChange={setDraft}
        onProviderTypeChange={(providerType) => setDraft(providerDraftDefaults(providerType))}
        onSubmit={() => void createProvider()}
      />

      <ModelProviderList
        providers={providers}
        modelsByProvider={modelsByProvider}
        activeProviderId={activeProviderId}
        activeModelId={activeModelId}
        onRefresh={(providerId) => void refresh(providerId)}
        onActivate={(providerId, modelId) => void activate(providerId, modelId)}
        onDelete={(providerId) => void removeProvider(providerId)}
      />
    </section>
  );
}
