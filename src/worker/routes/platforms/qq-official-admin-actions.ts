import { QqOfficialApiClient } from "../../../adapters/qq/official/api";
import { fetchQqOfficialGateway } from "../../../adapters/qq/official/gateway-object";
import { resolveQqOfficialCredential } from "../../../adapters/qq/official/credential";
import {
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck
} from "../../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../../shared/http";
import type { Env } from "../../../shared/types/env";
import { toQqOfficialIntegrationDto } from "./qq-official-dto";

type QqOfficialIntegration = NonNullable<
  Awaited<ReturnType<typeof getPlatformIntegrationRecord>>
>;

export async function testQqOfficialIntegration(
  env: Env,
  integration: QqOfficialIntegration
): Promise<Response> {
  const client = await createClient(env, integration);
  if (!client) {
    return errorResponse(400, "qq_official_secret_missing", "QQ official secret is missing");
  }

  try {
    const gateway = await client.getGatewayBot();
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toQqOfficialIntegrationDto(integration),
      gateway
    });
  } catch (error) {
    return recordQqOfficialActionError(env, integration.id, "qq_official_test_failed", error);
  }
}

export async function connectQqOfficialIntegration(
  env: Env,
  integration: QqOfficialIntegration
): Promise<Response> {
  if (connectionMode(integration) === "webhook") {
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toQqOfficialIntegrationDto(integration),
      gateway: {
        ok: true,
        status: "webhook",
        webhookPath: `/webhooks/qq-official/${integration.webhookSecret ?? integration.id}`
      }
    });
  }

  try {
    const response = await fetchQqOfficialGateway(
      env,
      integration.agentId,
      "/connect",
      { method: "POST" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = JSON.stringify(payload);
      await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {
        lastError: message
      });
      return errorResponse(response.status, "qq_official_connect_failed", message);
    }

    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toQqOfficialIntegrationDto(integration),
      gateway: payload
    });
  } catch (error) {
    return recordQqOfficialActionError(env, integration.id, "qq_official_connect_failed", error);
  }
}

export async function disconnectQqOfficialIntegration(
  env: Env,
  integration: QqOfficialIntegration
): Promise<Response> {
  if (connectionMode(integration) === "webhook") {
    return jsonResponse({
      ok: true,
      gateway: {
        ok: true,
        status: "webhook",
        webhookPath: `/webhooks/qq-official/${integration.webhookSecret ?? integration.id}`
      }
    });
  }

  try {
    const response = await fetchQqOfficialGateway(
      env,
      integration.agentId,
      "/disconnect",
      { method: "POST" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return errorResponse(response.status, "qq_official_disconnect_failed", JSON.stringify(payload));
    }

    return jsonResponse({ ok: true, gateway: payload });
  } catch (error) {
    return recordQqOfficialActionError(
      env,
      integration.id,
      "qq_official_disconnect_failed",
      error
    );
  }
}

export async function getQqOfficialIntegrationStatus(
  env: Env,
  integration: QqOfficialIntegration
): Promise<Response> {
  if (connectionMode(integration) === "webhook") {
    return jsonResponse({
      ok: true,
      integration: toQqOfficialIntegrationDto(integration),
      gateway: {
        ok: true,
        status: "webhook",
        webhookPath: `/webhooks/qq-official/${integration.webhookSecret ?? integration.id}`
      }
    });
  }

  const response = await fetchQqOfficialGateway(env, integration.agentId, "/status", {
    method: "GET"
  });
  const payload = await response.json().catch(() => ({}));
  return jsonResponse({
    ok: response.ok,
    integration: toQqOfficialIntegrationDto(integration),
    gateway: payload
  });
}

async function createClient(
  env: Env,
  integration: QqOfficialIntegration
): Promise<QqOfficialApiClient | undefined> {
  const appId = stringConfig(integration.config.appId);
  const secret =
    (await resolveQqOfficialCredential(env, integration)) ??
    stringConfig(integration.config.secret);
  if (!appId || !secret) {
    return undefined;
  }

  return new QqOfficialApiClient({
    appId,
    secret,
    isSandbox: Boolean(integration.config.isSandbox)
  });
}

async function recordQqOfficialActionError(
  env: Env,
  integrationId: string,
  code: string,
  error: unknown
): Promise<Response> {
  const message = error instanceof Error ? error.message : "QQ official action failed";
  await updatePlatformIntegrationCheck(env.AGENT_DB, integrationId, {
    lastError: message
  });
  return errorResponse(502, code, message);
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function connectionMode(integration: QqOfficialIntegration): "gateway" | "webhook" {
  return stringConfig(integration.config.connectionMode) === "webhook" ? "webhook" : "gateway";
}
