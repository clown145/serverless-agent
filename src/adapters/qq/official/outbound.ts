import type {
  OutboundFile,
  PlatformOutboundAdapter,
  PlatformSendResult
} from "../../../platforms/outbound/types";
import type { Env } from "../../../shared/types/env";
import { fetchQqOfficialGateway } from "./gateway-object";

export function createQqOfficialOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "qq",
    sendText: (input) =>
      sendQqOfficialText(env, input.agentId, input.conversationId, input.text),
    sendFile: (input) =>
      sendQqOfficialFile(env, input.agentId, input.conversationId, input.file, {
        caption: input.caption
      }),
    sendImage: (input) =>
      sendQqOfficialFile(env, input.agentId, input.conversationId, input.file, {
        caption: input.caption
      })
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

export async function sendQqOfficialFile(
  env: Env,
  agentId: string,
  conversationId: string,
  file: OutboundFile,
  options: { caption?: string } = {}
): Promise<PlatformSendResult> {
  const response = await fetchQqOfficialGateway(env, agentId, "/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conversationId,
      text: options.caption || undefined,
      file: {
        bytes: Array.from(file.bytes),
        fileName: file.fileName,
        mimeType: file.mimeType
      }
    })
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
      error: payload?.message ?? payload?.error ?? `QQ official file send failed ${response.status}`
    };
  }

  return payload?.result ?? { ok: false, error: "QQ official file send returned no result" };
}
