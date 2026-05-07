import { createSearchProviderFromRecord } from "../../tools/search/provider-factory";
import { webSearchInputSchema } from "../../tools/search/schema";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  deleteSearchProviderRecord,
  getSearchProviderRecord
} from "../../storage/repositories/search-providers-repository";
import { requireAdmin } from "../admin-auth";
import { testSearchProviderSchema, zodMessage } from "./search/search-schemas";

export async function handleAdminSearchProviderDetail(
  request: Request,
  env: Env,
  providerId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "DELETE") {
    const deleted = await deleteSearchProviderRecord(env.AGENT_DB, providerId);
    if (!deleted) {
      return errorResponse(404, "search_provider_not_found", "Search provider not found");
    }

    return jsonResponse({ ok: true, deleted });
  }

  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname.endsWith("/test")) {
    const provider = await getSearchProviderRecord(env.AGENT_DB, providerId);
    if (!provider) {
      return errorResponse(404, "search_provider_not_found", "Search provider not found");
    }

    const parsed = testSearchProviderSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    try {
      const searchProvider = await createSearchProviderFromRecord(env, provider);
      const result = await searchProvider.search(
        webSearchInputSchema.parse({
          query: parsed.data.query,
          maxResults: parsed.data.maxResults
        })
      );
      return jsonResponse({ ok: true, result });
    } catch (error) {
      return errorResponse(
        502,
        "search_test_failed",
        error instanceof Error ? error.message : "Search provider test failed"
      );
    }
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
