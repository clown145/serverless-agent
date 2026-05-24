import { listSearchProviderRecords } from "../../storage/repositories/search-providers-repository";
import { getSearchSettings } from "../../storage/repositories/search-settings-repository";
import type { SearchProviderType } from "../../storage/repositories/search-types";
import type { Env } from "../../shared/types/env";
import { diagnosticError, diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

export async function checkSearchConfig(env: Env, agentId: string): Promise<DiagnosticCheck[]> {
  const [providers, settings] = await Promise.all([
    listSearchProviderRecords(env.AGENT_DB),
    getSearchSettings(env.AGENT_DB, agentId)
  ]);
  const activeProviders = providers.filter((provider) => provider.status === "active");
  const activeProvider = activeProviders.find((provider) => provider.id === settings?.providerId);
  const envProvider = env.TAVILY_API_KEY ? "Tavily" : env.EXA_API_KEY ? "Exa" : undefined;
  const activeProviderHasKey = activeProvider
    ? Boolean(
        activeProvider.credentialId ||
        envSearchCredentialAvailable(env, activeProvider.providerType)
      )
    : false;

  return [
    providersCheck(activeProviders.length, envProvider),
    activeProviderCheck(activeProvider?.name, activeProvider?.providerType, envProvider),
    credentialsCheck(activeProvider?.name, activeProviderHasKey, envProvider),
    resultCountCheck(settings?.defaultMaxResults)
  ];
}

function providersCheck(count: number, envProvider?: string): DiagnosticCheck {
  if (count) {
    return diagnosticOk(
      "search",
      "search_providers",
      "Search providers",
      `${count} active provider(s)`
    );
  }

  return envProvider
    ? diagnosticWarn(
        "search",
        "search_providers",
        "Search providers",
        `No WebUI search provider configured; using ${envProvider} environment fallback`,
        "Create a search provider in WebUI"
      )
    : diagnosticWarn(
        "search",
        "search_providers",
        "Search providers",
        "No search provider configured",
        "Create a Tavily or Exa provider"
      );
}

function activeProviderCheck(name?: string, type?: string, envProvider?: string): DiagnosticCheck {
  if (name && type) {
    if (type === "custom") {
      return diagnosticError(
        "search",
        "active_search_provider",
        "Active search provider",
        `${name} is custom, but custom search runtime is not implemented yet`,
        "Use Tavily or Exa for now"
      );
    }

    return diagnosticOk(
      "search",
      "active_search_provider",
      "Active search provider",
      `${name} (${type})`
    );
  }

  return envProvider
    ? diagnosticWarn(
        "search",
        "active_search_provider",
        "Active search provider",
        `${envProvider} environment fallback will be used`,
        "Activate a WebUI search provider"
      )
    : diagnosticWarn(
        "search",
        "active_search_provider",
        "Active search provider",
        "No active provider selected",
        "Activate a search provider"
      );
}

function credentialsCheck(
  activeProviderName: string | undefined,
  activeProviderHasKey: boolean,
  envProvider?: string
): DiagnosticCheck {
  if (activeProviderName) {
    return activeProviderHasKey
      ? diagnosticOk("search", "search_credentials", "Search credentials", "Credential available")
      : diagnosticError(
          "search",
          "search_credentials",
          "Search credentials",
          `${activeProviderName} has no API key`,
          "Save an API key for the active search provider"
        );
  }

  return envProvider
    ? diagnosticOk(
        "search",
        "search_credentials",
        "Search credentials",
        `${envProvider} environment API key available`
      )
    : diagnosticWarn(
        "search",
        "search_credentials",
        "Search credentials",
        "No search API key found",
        "Save a search provider API key"
      );
}

function resultCountCheck(defaultMaxResults?: number): DiagnosticCheck {
  return defaultMaxResults
    ? diagnosticOk(
        "search",
        "search_result_count",
        "Search result count",
        `${defaultMaxResults} result(s) by default`
      )
    : diagnosticWarn(
        "search",
        "search_result_count",
        "Search result count",
        "Using default of 5 result(s)",
        "Set the default result count in Search"
      );
}

function envSearchCredentialAvailable(env: Env, providerType: SearchProviderType): boolean {
  if (providerType === "tavily") {
    return Boolean(env.TAVILY_API_KEY);
  }

  if (providerType === "exa") {
    return Boolean(env.EXA_API_KEY);
  }

  return false;
}
