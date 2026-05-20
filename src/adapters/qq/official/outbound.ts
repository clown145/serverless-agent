import type {
  PlatformOutboundAdapter,
  PlatformSendResult
} from "../../../platforms/outbound/types";
import type { Env } from "../../../shared/types/env";
import { fetchQqOfficialGateway } from "./gateway-object";

export function createQqOfficialOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "qq",
    sendText: (input) =>
      sendQqOfficialText(env, input.agentId, input.conversationId, input.text)
  };
}

export async function sendQqOfficialText(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  const response = await fetchQqOfficialGateway(env, agentId, "/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ conversationId, text })
  });
  const payload = (await response.json().catch(() => undefined)) as
    | {
        result?: PlatformSendResult;
        error?: string;
        message?: string;
      }
    | undefined;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.message ?? payload?.error ?? `QQ official send failed ${response.status}`
    };
  }

  return payload?.result ?? { ok: false, error: "QQ official send returned no result" };
}
