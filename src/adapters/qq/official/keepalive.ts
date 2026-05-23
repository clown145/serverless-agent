import type { Env } from "../../../shared/types/env";
import { listQqOfficialBots } from "./config";
import { fetchQqOfficialGateway } from "./gateway-object";

export async function connectConfiguredQqOfficialGateways(
  env: Env
): Promise<Array<{ agentId: string; ok: boolean; error?: string }>> {
  const bots = await listQqOfficialBots(env);
  const results = [];

  for (const bot of bots) {
    if (bot.connectionMode === "webhook") {
      results.push({
        agentId: bot.agentId,
        ok: true
      });
      continue;
    }

    if (!bot.appId || !bot.secret) {
      results.push({
        agentId: bot.agentId,
        ok: false,
        error: "QQ official appId/secret is not configured"
      });
      continue;
    }

    const response = await fetchQqOfficialGateway(env, bot.agentId, "/connect", {
      method: "POST"
    });
    results.push({
      agentId: bot.agentId,
      ok: response.ok,
      error: response.ok ? undefined : await response.text()
    });
  }

  return results;
}
