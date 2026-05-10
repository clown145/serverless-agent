import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type {
  MessageAttachment,
  Platform,
  SenderRole
} from "../../shared/types/internal-message";
import { createAdminMessage } from "../../adapters/admin/normalize";
import { createWebUiMessage } from "../../adapters/webui/normalize";
import type { QueueMessageBody } from "../../shared/types/queue";
import { listConversationMessages } from "../../storage/repositories/messages-repository";
import { dispatchAgentJob, enqueueAgentJob } from "../agent-dispatch";
import { requireAdmin } from "../admin-auth";
import { listMessagesSchema, zodMessage } from "./messages/message-schemas";

type AdminMessagePayload = {
  text?: string;
  agentId?: string;
  platform?: Extract<Platform, "admin" | "webui">;
  conversationId?: string;
  senderId?: string;
  displayName?: string;
  role?: SenderRole;
  mode?: "queue" | "sync";
  attachments?: MessageAttachment[];
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

  if (request.method === "GET") {
    return handleListMessages(request, env);
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const payload = (await request.json()) as AdminMessagePayload;
  if (!payload.text && !payload.attachments?.length) {
    return errorResponse(400, "invalid_payload", "`text` or `attachments` is required");
  }

  const agentId = payload.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
  const messageInput = {
    agentId,
    text: payload.text ?? "",
    conversationId: payload.conversationId,
    senderId: payload.senderId,
    displayName: payload.displayName,
    role: payload.role,
    attachments: normalizePayloadAttachments(payload.attachments)
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

function normalizePayloadAttachments(
  attachments: MessageAttachment[] | undefined
): MessageAttachment[] {
  return (attachments ?? [])
    .filter((attachment) => attachment.type === "image" && attachment.dataBase64)
    .slice(0, 4)
    .map((attachment, index) => ({
      id: attachment.id || `webui_image_${index}`,
      type: "image",
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      dataBase64: attachment.dataBase64
    }));
}

async function handleListMessages(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parsed = listMessagesSchema.safeParse({
    agentId: url.searchParams.get("agentId") ?? undefined,
    conversationId: url.searchParams.get("conversationId") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });

  if (!parsed.success) {
    return errorResponse(400, "invalid_query", zodMessage(parsed.error));
  }

  const messages = await listConversationMessages(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    conversationId: parsed.data.conversationId,
    platform: parsed.data.platform,
    limit: parsed.data.limit
  });

  return jsonResponse({ ok: true, messages });
}
