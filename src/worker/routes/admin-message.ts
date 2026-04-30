import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { InternalMessage } from "../../shared/types/internal-message";
import type { QueueMessageBody } from "../../shared/types/queue";
import { dispatchAgentJob, enqueueAgentJob } from "../agent-dispatch";
import { requireAdmin } from "../admin-auth";

type AdminMessagePayload = {
  text: string;
  agentId?: string;
  mode?: "queue" | "sync";
};

export async function handleAdminMessage(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
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

  if (payload.mode === "sync") {
    const result = await dispatchAgentJob(env, job);
    return jsonResponse({ ok: true, eventId: job.eventId, result });
  }

  await enqueueAgentJob(env, job);
  return jsonResponse({ ok: true, eventId: job.eventId, queued: true });
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
