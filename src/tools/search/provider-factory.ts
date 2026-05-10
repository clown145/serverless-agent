import type { Env } from "../../shared/types/env";
import { getSearchSettings } from "../../storage/repositories/search-settings-repository";
import { getSearchProviderRecord } from "../../storage/repositories/search-providers-repository";
import type { SearchProviderRecord } from "../../storage/repositories/search-types";
import { resolveSearchCredential } from "./credential";
import type { SearchProvider } from "./provider-types";
import { ExaSearchProvider } from "./exa-provider";
import { TavilySearchProvider } from "./tavily-provider";

export async function createSearchProvider(
  env: Env,
  agentId: string
): Promise<SearchProvider> {
  const settings = await getSearchSettings(env.AGENT_DB, agentId);
  if (settings?.providerId) {
    const provider = await getSearchProviderRecord(env.AGENT_DB, settings.providerId);
    if (provider && provider.status === "active") {
      return createSearchProviderFromRecord(env, provider);
    }
  }

  return createEnvSearchProvider(env);
}

export async function createSearchProviderFromRecord(
  env: Env,
  provider: SearchProviderRecord
): Promise<SearchProvider> {
  if (provider.providerType === "tavily") {
    const apiKey = await resolveSearchCredential(env, provider);
    if (!apiKey) {
      throw new Error("Tavily API key is missing");
    }

    return new TavilySearchProvider({
      apiKey,
      baseUrl: provider.baseUrl
    });
  }

  if (provider.providerType === "exa") {
    const apiKey = await resolveSearchCredential(env, provider);
    if (!apiKey) {
      throw new Error("Exa API key is missing");
    }

    return new ExaSearchProvider({
      apiKey,
      baseUrl: provider.baseUrl
    });
  }

  throw new Error(`Unsupported search provider: ${provider.providerType}`);
}

function createEnvSearchProvider(env: Env): SearchProvider {
  if (env.TAVILY_API_KEY) {
    return new TavilySearchProvider({
      apiKey: env.TAVILY_API_KEY,
      baseUrl: env.TAVILY_BASE_URL
    });
  }

  if (env.EXA_API_KEY) {
    return new ExaSearchProvider({
      apiKey: env.EXA_API_KEY,
      baseUrl: env.EXA_BASE_URL
    });
  }

  throw new Error("No search provider configured");
}
