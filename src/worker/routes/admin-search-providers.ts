import { encryptSearchCredential } from "../../tools/search/credential";
import { createSearchProviderFromRecord } from "../../tools/search/provider-factory";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { createSearchProviderCredentialRecord } from "../../storage/repositories/search-credentials-repository";
import {
  createSearchProviderRecord,
  getSearchProviderRecord,
  listSearchProviderRecords,
  updateSearchProviderCredential
} from "../../storage/repositories/search-providers-repository";
import {
  getSearchSettings,
  setSearchSettings
} from "../../storage/repositories/search-settings-repository";
import { requireAdmin } from "../admin-auth";
import {
  createSearchProviderSchema,
  setSearchProviderSchema,
  zodMessage
} from "./search/search-schemas";
import { toSearchProviderDto, toSearchSettingsDto } from "./search/search-dto";

export async function handleAdminSearchProviders(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    const agentId =
      new URL(request.url).searchParams.get("agentId") ??
      env.DEFAULT_AGENT_ID ??
      "default";
    const [providers, settings] = await Promise.all([
      listSearchProviderRecords(env.AGENT_DB),
      getSearchSettings(env.AGENT_DB, agentId)
    ]);

    return jsonResponse({
      ok: true,
      providers: providers.map(toSearchProviderDto),
      settings: toSearchSettingsDto(settings)
    });
  }

  if (request.method === "POST") {
    const parsed = createSearchProviderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    if (requiresApiKey(parsed.data.providerType) && !parsed.data.apiKey?.trim()) {
      return errorResponse(
        400,
        "missing_search_api_key",
        `${searchProviderDisplayName(parsed.data.providerType)} API key is required`
      );
    }

    if (!isSupportedSearchProvider(parsed.data.providerType)) {
      return errorResponse(
        400,
        "unsupported_search_provider",
        "Only Tavily and Exa search providers are supported currently"
      );
    }

    let provider = await createSearchProviderRecord(env.AGENT_DB, {
      name: parsed.data.name,
      providerType: parsed.data.providerType,
      baseUrl: parsed.data.baseUrl
    });

    if (parsed.data.apiKey) {
      try {
        const encrypted = await encryptSearchCredential(env, parsed.data.apiKey);
        const credential = await createSearchProviderCredentialRecord(env.AGENT_DB, {
          providerId: provider.id,
          encryptedValue: encrypted.encryptedValue,
          iv: encrypted.iv,
          algorithm: encrypted.algorithm
        });
        provider =
          (await updateSearchProviderCredential(env.AGENT_DB, provider.id, credential.id)) ??
          provider;
      } catch (error) {
        return errorResponse(
          400,
          "credential_encryption_unavailable",
          error instanceof Error ? error.message : "Unable to encrypt search credential"
        );
      }
    }

    const agentId = env.DEFAULT_AGENT_ID ?? "default";
    const settings = await getSearchSettings(env.AGENT_DB, agentId);
    if (!settings) {
      await setSearchSettings(env.AGENT_DB, { agentId, providerId: provider.id });
    }

    return jsonResponse({ ok: true, provider: toSearchProviderDto(provider) }, { status: 201 });
  }

  if (request.method === "PUT") {
    const parsed = setSearchProviderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const provider = await getSearchProviderRecord(env.AGENT_DB, parsed.data.providerId);
    if (!provider) {
      return errorResponse(404, "search_provider_not_found", "Search provider not found");
    }

    try {
      await createSearchProviderFromRecord(env, provider);
    } catch (error) {
      return errorResponse(
        400,
        "search_provider_unavailable",
        error instanceof Error ? error.message : "Search provider unavailable"
      );
    }

    const settings = await setSearchSettings(env.AGENT_DB, {
      agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
      providerId: parsed.data.providerId
    });

    return jsonResponse({ ok: true, settings });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

function isSupportedSearchProvider(providerType: string): boolean {
  return providerType === "tavily" || providerType === "exa";
}

function requiresApiKey(providerType: string): boolean {
  return isSupportedSearchProvider(providerType);
}

function searchProviderDisplayName(providerType: string): string {
  return providerType === "exa" ? "Exa" : "Tavily";
}
