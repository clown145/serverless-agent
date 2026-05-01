import { z } from "zod";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { defaultSecretName } from "../../core/model/provider-config";
import { fetchProviderModels } from "../../core/model/model-list";
import { SECRET_BINDING_NAME_PATTERN } from "../../core/model/secret-binding";
import {
  getModelSettings,
  setModelSettings
} from "../../storage/repositories/agent-model-settings-repository";
import {
  listModelCatalog,
  upsertModelCatalog
} from "../../storage/repositories/model-catalog-repository";
import {
  createModelProviderRecord,
  deleteModelProviderRecord,
  getModelProviderRecord,
  listModelProviders,
} from "../../storage/repositories/model-providers-repository";
import { requireAdmin } from "../admin-auth";

const secretBindingSchema = z.string().trim().regex(
  SECRET_BINDING_NAME_PATTERN,
  "Secret binding must look like GEMINI_API_KEY, not the API key value"
);

const createProviderSchema = z.object({
  name: z.string().min(1),
  providerType: z.enum(["openai", "gemini", "mock"]),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKeySecret: secretBindingSchema.optional()
});

const setActiveModelSchema = z.object({
  agentId: z.string().min(1).optional(),
  providerId: z.string().min(1),
  modelId: z.string().min(1)
});

export async function handleAdminModelSettings(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    const agentId = new URL(request.url).searchParams.get("agentId") ?? env.DEFAULT_AGENT_ID ?? "default";
    const [providers, models, settings] = await Promise.all([
      listModelProviders(env.AGENT_DB),
      listModelCatalog(env.AGENT_DB),
      getModelSettings(env.AGENT_DB, agentId)
    ]);

    return jsonResponse({ ok: true, providers, models, settings });
  }

  if (request.method === "POST") {
    const parsed = createProviderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const provider = await createModelProviderRecord(env.AGENT_DB, {
      name: parsed.data.name,
      providerType: parsed.data.providerType,
      baseUrl: parsed.data.baseUrl || undefined,
      apiKeySecret: parsed.data.apiKeySecret ?? defaultSecretName(parsed.data.providerType)
    });

    return jsonResponse({ ok: true, provider }, { status: 201 });
  }

  if (request.method === "PUT") {
    const parsed = setActiveModelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const settings = await setModelSettings(env.AGENT_DB, {
      agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId
    });

    return jsonResponse({ ok: true, settings });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}

export async function handleAdminModelProviderDetail(
  request: Request,
  env: Env,
  providerId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "DELETE") {
    const deleted = await deleteModelProviderRecord(env.AGENT_DB, providerId);
    if (!deleted) {
      return errorResponse(404, "provider_not_found", "Model provider not found");
    }

    return jsonResponse({ ok: true, deleted });
  }

  if (request.method === "POST" && new URL(request.url).pathname.endsWith("/refresh")) {
    const provider = await getModelProviderRecord(env.AGENT_DB, providerId);
    if (!provider) {
      return errorResponse(404, "provider_not_found", "Model provider not found");
    }

    try {
      const remoteModels = await fetchProviderModels(env, provider);
      const models = await upsertModelCatalog(env.AGENT_DB, {
        providerId,
        models: remoteModels
      });

      return jsonResponse({ ok: true, models });
    } catch (error) {
      return errorResponse(
        502,
        "model_refresh_failed",
        error instanceof Error ? error.message : "Failed to refresh models"
      );
    }
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
