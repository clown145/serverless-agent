import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { SearchProvider, SearchTestResult } from "../../api/types";
import { JsonBlock } from "../JsonBlock";
import { ToolbarButton } from "../ToolbarButton";
import { SearchProviderForm, type SearchProviderDraft } from "./search/SearchProviderForm";
import { SearchProviderList } from "./search/SearchProviderList";
import type { PanelProps } from "./types";

export function SearchPanel({ client, notify }: PanelProps) {
  const [providers, setProviders] = useState<SearchProvider[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
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
      notify("Search provider created", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create search provider", "error");
    }
  }

  async function activate(providerId: string) {
    try {
      await client.activateSearchProvider(providerId);
      notify("Search provider activated", "ok");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to activate search provider", "error");
    }
  }

  async function test(providerId: string) {
    try {
      const result = await client.testSearchProvider(providerId, {
        query: testQuery,
        maxResults: 3
      });
      setTestResult(result.result);
      notify(`${result.result.results.length} results`, "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Search test failed", "error");
    }
  }

  async function remove(providerId: string) {
    try {
      await client.deleteSearchProvider(providerId);
      notify("Search provider deleted", "ok");
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
          <h1>Search</h1>
          <p>{activeProviderId || "not configured"}</p>
        </div>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <SearchProviderForm
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void createProvider()}
      />

      <div className="field-row">
        <label>
          Test query
          <input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} />
        </label>
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
