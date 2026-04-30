import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { Platform, SenderRole } from "../../shared/types/internal-message";
import { createAdminMessage } from "../../adapters/admin/normalize";
import { createWebUiMessage } from "../../adapters/webui/normalize";
import type { QueueMessageBody } from "../../shared/types/queue";
import { dispatchAgentJob, enqueueAgentJob } from "../agent-dispatch";
import { requireAdmin } from "../admin-auth";

type AdminMessagePayload = {
  text: string;
  agentId?: string;
  platform?: Extract<Platform, "admin" | "webui">;
  conversationId?: string;
  senderId?: string;
  displayName?: string;
  role?: SenderRole;
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
  const messageInput = {
    agentId,
    text: payload.text,
    conversationId: payload.conversationId,
    senderId: payload.senderId,
    displayName: payload.displayName,
    role: payload.role
  };
  const message =
    payload.platform === "webui"
      ? createWebUiMessage(messageInput)
      : createAdminMessage(messageInput);
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
