import type { Env } from "../../shared/types/env";
import { fetchWeixinOcGatewayForIntegration } from "./gateway-object";
import { listWeixinOcBots } from "./config";

export async function connectConfiguredWeixinOcGateways(
  env: Env
): Promise<Array<{ agentId: string; integrationId: string; ok: boolean; error?: string }>> {
  const bots = await listWeixinOcBots(env);
  const results = [];

  for (const bot of bots) {
    const response = await fetchWeixinOcGatewayForIntegration(
      env,
      bot.integrationId,
      "/connect",
      { method: "POST" }
    );
    results.push({
      agentId: bot.agentId,
      integrationId: bot.integrationId,
      ok: response.ok,
      error: response.ok ? undefined : await response.text()
    });
  }

  return results;
}
