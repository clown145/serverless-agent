import { fetchWeixinOcGatewayForIntegration } from "../../../adapters/weixin-oc/gateway-object";
import {
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck
} from "../../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../../shared/http";
import type { Env } from "../../../shared/types/env";
import { toWeixinOcIntegrationDto } from "./weixin-oc-dto";

type WeixinOcIntegration = NonNullable<
  Awaited<ReturnType<typeof getPlatformIntegrationRecord>>
>;

export async function connectWeixinOcIntegration(
  env: Env,
  integration: WeixinOcIntegration
): Promise<Response> {
  return gatewayAction(env, integration, "/connect", "POST", "weixin_oc_connect_failed");
}

export async function startWeixinOcLogin(
  env: Env,
  integration: WeixinOcIntegration
): Promise<Response> {
  return gatewayAction(env, integration, "/login/start", "POST", "weixin_oc_login_failed");
}

export async function disconnectWeixinOcIntegration(
  env: Env,
  integration: WeixinOcIntegration
): Promise<Response> {
  return gatewayAction(env, integration, "/disconnect", "POST", "weixin_oc_disconnect_failed");
}

export async function getWeixinOcIntegrationStatus(
  env: Env,
  integration: WeixinOcIntegration
): Promise<Response> {
  const response = await fetchWeixinOcGatewayForIntegration(
    env,
    integration.id,
    "/status",
    { method: "GET" }
  );
  const payload = await response.json().catch(() => ({}));
  return jsonResponse({
    ok: response.ok,
    integration: toWeixinOcIntegrationDto(integration),
    gateway: payload
  });
}

async function gatewayAction(
  env: Env,
  integration: WeixinOcIntegration,
  pathname: string,
  method: "POST" | "GET",
  errorCode: string
): Promise<Response> {
  try {
    const response = await fetchWeixinOcGatewayForIntegration(
      env,
      integration.id,
      pathname,
      { method }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = JSON.stringify(payload);
      await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {
        lastError: message
      });
      return errorResponse(response.status, errorCode, message);
    }

    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toWeixinOcIntegrationDto(integration),
      gateway: payload
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weixin OC action failed";
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {
      lastError: message
    });
    return errorResponse(502, errorCode, message);
  }
}
