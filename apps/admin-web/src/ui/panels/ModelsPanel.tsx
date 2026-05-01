import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModelCatalogItem, ModelProvider } from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { ModelProviderForm } from "./models/ModelProviderForm";
import { ModelProviderList } from "./models/ModelProviderList";
import type { PanelProps } from "./types";

const secretBindingPattern = /^[A-Z_][A-Z0-9_]*$/;

export function ModelsPanel({ client, notify }: PanelProps) {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [activeModelId, setActiveModelId] = useState("");
  const [name, setName] = useState("OpenAI");
  const [providerType, setProviderType] = useState<ModelProvider["providerType"]>("openai");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKeySecret, setApiKeySecret] = useState("OPENAI_API_KEY");

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
    if (apiKeySecret && !secretBindingPattern.test(apiKeySecret)) {
      notify("Secret binding must look like GEMINI_API_KEY", "error");
      return;
    }

    try {
      await client.createModelProvider({
        name,
        providerType,
        baseUrl: baseUrl || undefined,
        apiKeySecret: apiKeySecret || undefined
      });
      notify("Provider created", "ok");
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

  useEffect(() => {
    if (providerType === "gemini") {
      setName("Gemini");
      setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
      setApiKeySecret("GEMINI_API_KEY");
    } else if (providerType === "openai") {
      setName("OpenAI");
      setBaseUrl("https://api.openai.com/v1");
      setApiKeySecret("OPENAI_API_KEY");
    } else {
      setName("Mock");
      setBaseUrl("");
      setApiKeySecret("MODEL_API_KEY");
    }
  }, [providerType]);

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
        name={name}
        providerType={providerType}
        baseUrl={baseUrl}
        apiKeySecret={apiKeySecret}
        onNameChange={setName}
        onProviderTypeChange={setProviderType}
        onBaseUrlChange={setBaseUrl}
        onApiKeySecretChange={setApiKeySecret}
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
