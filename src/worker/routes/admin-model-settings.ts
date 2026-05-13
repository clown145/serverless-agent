import {
  encryptProviderCredential,
  type EncryptedProviderCredential
} from "../../core/model/provider-credential";
import { modelProviderDefaults } from "../../core/model/provider-defaults";
import { testModelProvider } from "../../core/model/model-test";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { fetchProviderModels } from "../../core/model/model-list";
import {
  getModelSettings,
  setModelSettings
} from "../../storage/repositories/agent-model-settings-repository";
import { createModelCredentialRecord } from "../../storage/repositories/model-credentials-repository";
import {
  listEnabledModelCatalog,
  listModelCatalog,
  updateModelCatalogCapabilities,
  updateModelCatalogStatus,
  upsertModelCatalog
} from "../../storage/repositories/model-catalog-repository";
import {
  createModelProviderRecord,
  deleteModelProviderRecord,
  getModelProviderRecord,
  listModelProviders,
  updateModelProviderCredential,
} from "../../storage/repositories/model-providers-repository";
import { requireAdmin } from "../admin-auth";
import {
  createProviderSchema,
  setActiveModelSchema,
  testModelSchema,
  updateModelCatalogSchema,
  zodMessage
} from "./model-settings/model-settings-schemas";
import { toProviderDto } from "./model-settings/model-provider-dto";

export async function handleAdminModelSettings(
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
    const [providers, models, settings] = await Promise.all([
      listModelProviders(env.AGENT_DB),
      listModelCatalog(env.AGENT_DB),
      getModelSettings(env.AGENT_DB, agentId)
    ]);

    return jsonResponse({
      ok: true,
      providers: providers.map(toProviderDto),
      models,
      settings
    });
  }

  if (request.method === "POST") {
    const parsed = createProviderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const defaults = modelProviderDefaults(parsed.data.providerType);
    const authType = parsed.data.authType ?? defaults.authType;
    const apiKey = parsed.data.apiKey?.trim();
    if (authType !== "none" && !apiKey && !parsed.data.apiKeySecret) {
      return errorResponse(
        400,
        "missing_provider_api_key",
        "API key is required unless auth is none"
      );
    }

    let encrypted: EncryptedProviderCredential | undefined;
    if (apiKey) {
      const result = await encryptCredentialOrRespond(env, apiKey);
      if (result instanceof Response) {
        return result;
      }
      encrypted = result;
    }

    let provider = await createModelProviderRecord(env.AGENT_DB, {
      name: parsed.data.name,
      providerType: parsed.data.providerType,
      baseUrl: parsed.data.baseUrl || undefined,
      apiKeySecret: parsed.data.apiKeySecret,
      authType,
      authHeader: parsed.data.authHeader || undefined,
      authQueryParam: parsed.data.authQueryParam || undefined,
      modelListStrategy: parsed.data.modelListStrategy ?? defaults.modelListStrategy,
      chatProtocol: parsed.data.chatProtocol ?? defaults.chatProtocol
    });

    if (apiKey && encrypted) {
      const credential = await createModelCredentialRecord(env.AGENT_DB, {
        providerId: provider.id,
        encryptedValue: encrypted.encryptedValue,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm
      });
      provider = await updateModelProviderCredential(env.AGENT_DB, provider.id, credential.id) ?? provider;
    }

    return jsonResponse({ ok: true, provider: toProviderDto(provider) }, { status: 201 });
  }

  if (request.method === "PUT") {
    const parsed = setActiveModelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const enabledModels = await listEnabledModelCatalog(
      env.AGENT_DB,
      parsed.data.providerId
    );
    const enabledModel = enabledModels.find(
      (model) => model.modelId === parsed.data.modelId
    );
    if (!enabledModel) {
      return errorResponse(
        400,
        "model_not_enabled",
        "Enable the model before selecting it as the default"
      );
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

async function encryptCredentialOrRespond(
  env: Env,
  apiKey: string
) {
  try {
    return await encryptProviderCredential(env, apiKey);
  } catch (error) {
    return errorResponse(
      400,
      "credential_encryption_unavailable",
      error instanceof Error ? error.message : "Unable to encrypt provider key"
    );
  }
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

  const pathname = new URL(request.url).pathname;

  if (request.method === "POST" && pathname.endsWith("/test")) {
    const provider = await getModelProviderRecord(env.AGENT_DB, providerId);
    if (!provider) {
      return errorResponse(404, "provider_not_found", "Model provider not found");
    }

    const parsed = testModelSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    try {
      const agentId = env.DEFAULT_AGENT_ID ?? "default";
      const [models, settings] = await Promise.all([
        listModelCatalog(env.AGENT_DB, providerId),
        getModelSettings(env.AGENT_DB, agentId)
      ]);
      const result = await testModelProvider({
        env,
        provider,
        models,
        settings,
        modelId: parsed.data.modelId,
        prompt: parsed.data.prompt
      });
      return jsonResponse({ ok: true, result });
    } catch (error) {
      return errorResponse(
        502,
        "model_test_failed",
        error instanceof Error ? error.message : "Failed to test model"
      );
    }
  }

  if (request.method === "POST" && pathname.endsWith("/refresh")) {
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

export async function handleAdminModelCatalogDetail(
  request: Request,
  env: Env,
  modelCatalogId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "PUT") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = updateModelCatalogSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  let model = parsed.data.capabilities
    ? await updateModelCatalogCapabilities(
        env.AGENT_DB,
        modelCatalogId,
        parsed.data.capabilities
      )
    : undefined;

  if (parsed.data.status) {
    model = await updateModelCatalogStatus(
      env.AGENT_DB,
      modelCatalogId,
      parsed.data.status
    );
  }

  if (!model) {
    return errorResponse(404, "model_not_found", "Model not found");
  }

  return jsonResponse({ ok: true, model });
}
