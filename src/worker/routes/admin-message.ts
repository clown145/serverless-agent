import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { InternalMessage } from "../../shared/types/internal-message";
import type { QueueMessageBody } from "../../shared/types/queue";

type AdminMessagePayload = {
  text: string;
  agentId?: string;
};

export async function handleAdminMessage(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (env.INTERNAL_ADMIN_TOKEN && auth !== `Bearer ${env.INTERNAL_ADMIN_TOKEN}`) {
    return errorResponse(401, "unauthorized", "Invalid admin token");
  }

  const payload = (await request.json()) as AdminMessagePayload;
  if (!payload.text) {
    return errorResponse(400, "invalid_payload", "`text` is required");
  }

  const agentId = payload.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
  const message = createAdminMessage(agentId, payload.text);
  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId,
    message,
    receivedAt: nowIso()
  };

  await env.AGENT_QUEUE.send(job);
  return jsonResponse({ ok: true, eventId: job.eventId });
}

function createAdminMessage(agentId: string, text: string): InternalMessage {
  const id = createId("msg");
  return {
    id,
    platform: "admin",
    platformMessageId: id,
    agentId,
    conversationId: "admin:default",
    sender: {
      platformUserId: "admin",
      displayName: "Admin",
      role: "owner"
    },
    kind: text.startsWith("/") ? "command" : "text",
    text,
    attachments: [],
    receivedAt: nowIso()
  };
}
