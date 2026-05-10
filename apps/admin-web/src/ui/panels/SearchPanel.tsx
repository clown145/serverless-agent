import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { SearchProvider, SearchTestResult } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { JsonBlock } from "../JsonBlock";
import { ToolbarButton } from "../ToolbarButton";
import { SearchProviderForm, type SearchProviderDraft } from "./search/SearchProviderForm";
import { SearchProviderList } from "./search/SearchProviderList";
import type { PanelProps } from "./types";

export function SearchPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<SearchProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [defaultMaxResults, setDefaultMaxResults] = useState(5);
  const [testQuery, setTestQuery] = useState("Cloudflare Workers serverless agent");
  const [testResult, setTestResult] = useState<SearchTestResult>();
  const [draft, setDraft] = useState<SearchProviderDraft>({
    name: "Tavily",
    providerType: "tavily",
    baseUrl: "",
    apiKey: ""
  });

  async function load() {
    try {
      const result = await client.getSearchProviders();
      setProviders(result.providers);
      setActiveProviderId(result.settings?.providerId ?? "");
      setDefaultMaxResults(result.settings?.defaultMaxResults ?? 5);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load search providers", "error");
    }
  }

  async function createProvider() {
    try {
      await client.createSearchProvider({
        name: draft.name,
        providerType: draft.providerType,
        baseUrl: draft.baseUrl || undefined,
        apiKey: draft.apiKey || undefined
      });
      setDraft({ ...draft, apiKey: "" });
      notify(t("search.providerCreated"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create search provider", "error");
    }
  }

  async function activate(providerId: string) {
    try {
      await client.activateSearchProvider(providerId);
      notify(t("search.providerActivated"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to activate search provider", "error");
    }
  }

  async function test(providerId: string) {
    try {
      const result = await client.testSearchProvider(providerId, {
        query: testQuery,
        maxResults: defaultMaxResults
      });
      setTestResult(result.result);
      notify(t("search.results", { count: result.result.results.length }), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Search test failed", "error");
    }
  }

  async function saveSearchSettings() {
    try {
      await client.updateSearchSettings({ defaultMaxResults });
      notify(t("search.settingsSaved"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save search settings", "error");
    }
  }

  async function remove(providerId: string) {
    try {
      await client.deleteSearchProvider(providerId);
      notify(t("search.providerDeleted"), "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete search provider", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("search.title")}</h1>
          <p>{activeProviderId || t("common.notConfigured")}</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <SearchProviderForm
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void createProvider()}
      />

      <div className="field-row">
        <label>
          {t("search.testQuery")}
          <input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} />
        </label>
      </div>

      <div className="form-grid single search-settings-form">
        <label>
          {t("search.defaultResults")}
          <input
            type="number"
            min="1"
            max="10"
            value={defaultMaxResults}
            onChange={(event) => setDefaultMaxResults(Number(event.target.value))}
          />
        </label>
        <button className="secondary-button" type="button" onClick={() => void saveSearchSettings()}>
          {t("common.save")}
        </button>
      </div>

      <SearchProviderList
        providers={providers}
        activeProviderId={activeProviderId}
        onActivate={(providerId) => void activate(providerId)}
        onTest={(providerId) => void test(providerId)}
        onDelete={(providerId) => void remove(providerId)}
      />

      {testResult && <JsonBlock value={testResult} />}
    </section>
  );
}
