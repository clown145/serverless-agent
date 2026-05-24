import type { Env } from "../../shared/types/env";
import {
  resolveWeixinOcBotByIntegrationId,
  resolveWeixinOcBotForAgent,
  type WeixinOcBotConfig,
  weixinOcObjectName
} from "./config";

export async function getWeixinOcGatewayObject(
  env: Env,
  agentId: string
): Promise<DurableObjectStub> {
  const config = await resolveWeixinOcBotForAgent(env, agentId);
  if (!config) {
    throw new Error("Weixin OC integration is not configured");
  }

  const objectId = env.WEIXIN_OC_GATEWAY.idFromName(weixinOcObjectName(config));
  return env.WEIXIN_OC_GATEWAY.get(objectId);
}

export async function getWeixinOcGatewayObjectForIntegration(
  env: Env,
  integrationId: string
): Promise<{ object: DurableObjectStub; config: WeixinOcBotConfig }> {
  const config = await resolveWeixinOcBotByIntegrationId(env, integrationId);
  if (!config) {
    throw new Error("Weixin OC integration is not configured");
  }

  const objectId = env.WEIXIN_OC_GATEWAY.idFromName(weixinOcObjectName(config));
  return {
    object: env.WEIXIN_OC_GATEWAY.get(objectId),
    config
  };
}

export async function fetchWeixinOcGateway(
  env: Env,
  agentId: string,
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  const object = await getWeixinOcGatewayObject(env, agentId);
  const url = new URL(`https://weixin-oc.local${pathname}`);
  url.searchParams.set("agentId", agentId);
  return object.fetch(url.toString(), init);
}

export async function fetchWeixinOcGatewayForIntegration(
  env: Env,
  integrationId: string,
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  const { object, config } = await getWeixinOcGatewayObjectForIntegration(env, integrationId);
  const url = new URL(`https://weixin-oc.local${pathname}`);
  url.searchParams.set("agentId", config.agentId);
  url.searchParams.set("integrationId", config.integrationId);
  return object.fetch(url.toString(), init);
}
