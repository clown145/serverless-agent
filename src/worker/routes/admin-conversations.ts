import { compactConversationById } from "../../context/context-loader";
import { rootConversationId } from "../../conversations/ids";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  ensureConversationSettings,
  getConversationSettings,
  listConversationSettings,
  updateConversationSettings
} from "../../storage/repositories/conversation-settings-repository";
import { toConversationDto } from "./conversations/conversation-dto";
import {
  compactConversationSchema,
  createConversationSchema,
  listConversationsQuerySchema,
  updateConversationSchema,
  zodMessage
} from "./conversations/conversation-schemas";

export async function handleAdminConversations(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    return listConversations(request, env);
  }

  if (request.method === "POST") {
    const parsed = createConversationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const agentId = parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
    const conversationId =
      parsed.data.conversationId ?? createWebUiConversationId(parsed.data.title);
    const conversation = await ensureConversationSettings(env.AGENT_DB, {
      agentId,
      conversationId,
      platform: parsed.data.platform,
      rootConversationId: parsed.data.rootConversationId ?? rootConversationId(conversationId),
      title: parsed.data.title
    });

    return jsonResponse({
      ok: true,
      conversation: toConversationDto(conversation)
    }, { status: 201 });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

export async function handleAdminConversationDetail(
  request: Request,
  env: Env,
  conversationId: string
): Promise<Response> {
  const url = new URL(request.url);
  const agentId =
    url.searchParams.get("agentId") ??
    env.DEFAULT_AGENT_ID ??
    "default";

  if (request.method === "GET") {
    const conversation = await getConversationSettings(env.AGENT_DB, agentId, conversationId);
    if (!conversation) {
      return errorResponse(404, "conversation_not_found", "Conversation not found");
    }

    return jsonResponse({ ok: true, conversation: toConversationDto(conversation) });
  }

  if (request.method === "PUT") {
    const parsed = updateConversationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const conversation = await updateConversationSettings(
      env.AGENT_DB,
      agentId,
      conversationId,
      parsed.data
    );
    if (!conversation) {
      return errorResponse(404, "conversation_not_found", "Conversation not found");
    }

    return jsonResponse({ ok: true, conversation: toConversationDto(conversation) });
  }

  if (request.method === "POST" && url.pathname.endsWith("/compact")) {
    const parsed = compactConversationSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
    }

    const conversation = await getConversationSettings(
      env.AGENT_DB,
      parsed.data.agentId ?? agentId,
      conversationId
    );
    if (!conversation) {
      return errorResponse(404, "conversation_not_found", "Conversation not found");
    }

    const summaryText = await compactConversationById(env, {
      agentId: conversation.agentId,
      conversationId: conversation.conversationId,
      platform: conversation.platform
    });
    const updated = await getConversationSettings(
      env.AGENT_DB,
      conversation.agentId,
      conversation.conversationId
    );

    return jsonResponse({
      ok: true,
      summaryText,
      conversation: toConversationDto(updated ?? conversation)
    });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function listConversations(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parsed = listConversationsQuerySchema.safeParse({
    agentId: url.searchParams.get("agentId") ?? undefined,
    platform: url.searchParams.get("platform") ?? undefined,
    rootConversationId: url.searchParams.get("rootConversationId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined
  });
  if (!parsed.success) {
    return errorResponse(400, "invalid_query", zodMessage(parsed.error));
  }

  const conversations = await listConversationSettings(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    platform: parsed.data.platform,
    rootConversationId: parsed.data.rootConversationId,
    limit: parsed.data.limit
  });

  return jsonResponse({
    ok: true,
    conversations: conversations.map(toConversationDto)
  });
}

function createWebUiConversationId(title: string | undefined): string {
  const slug = (title ?? "chat")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "chat";

  return `webui:${slug}-${crypto.randomUUID().slice(0, 8)}`;
}
