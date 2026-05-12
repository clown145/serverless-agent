import {
  confirmPendingAction,
  rejectPendingAction
} from "../../../permissions/pending-action-executor";
import { createId } from "../../../shared/ids";
import type { Env } from "../../../shared/types/env";
import type { QueueMessageBody } from "../../../shared/types/queue";
import { nowIso } from "../../../shared/time";
import {
  expirePlatformCallback,
  getPlatformCallback,
  markPlatformCallbackUsed
} from "../../../storage/repositories/platform-callbacks-repository";
import { answerTelegramCallbackQuery } from "../outbound";
import type { TelegramCallbackContext, TelegramCallbackHandlerResult } from "./types";

export async function handleTelegramCallbackQuery(
  env: Env,
  context: TelegramCallbackContext,
  token: string | undefined
): Promise<TelegramCallbackHandlerResult> {
  const callbackId = context.query.data;
  if (!callbackId) {
    await answerCallback(token, context.query.id, "没有回调数据");
    return { handled: true };
  }

  const callback = await getPlatformCallback(env.AGENT_DB, callbackId);
  if (!callback || callback.agentId !== context.agentId || callback.platform !== "telegram") {
    await answerCallback(token, context.query.id, "按钮已失效");
    return { handled: true };
  }

  if (callback.status !== "active") {
    await answerCallback(token, context.query.id, "按钮已使用");
    return { handled: true };
  }

  if (new Date(callback.expiresAt).getTime() < Date.now()) {
    await expirePlatformCallback(env.AGENT_DB, callback.id);
    await answerCallback(token, context.query.id, "按钮已过期");
    return { handled: true };
  }

  const payload = parsePayload(callback.payloadJson);

  if (callback.action === "pending.confirm") {
    const actionId = stringPayload(payload, "actionId");
    if (!actionId) {
      await answerCallback(token, context.query.id, "缺少确认 ID");
      return { handled: true };
    }

    const result = await confirmPendingAction(env, actionId);
    if (result.ok) {
      await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
    }
    await answerCallback(token, context.query.id, result.ok ? "已确认" : result.message);
    return { handled: true };
  }

  if (callback.action === "pending.reject") {
    const actionId = stringPayload(payload, "actionId");
    if (!actionId) {
      await answerCallback(token, context.query.id, "缺少确认 ID");
      return { handled: true };
    }

    const result = await rejectPendingAction(env, actionId);
    if (result.ok) {
      await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
    }
    await answerCallback(token, context.query.id, result.ok ? "已拒绝" : result.message);
    return { handled: true };
  }

  if (callback.action === "agent.message") {
    await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
    const text =
      stringPayload(payload, "text") ??
      stringPayload(payload, "message") ??
      stringPayload(payload, "buttonLabel") ??
      findButtonLabel(context, callback.id);
    if (!text) {
      await answerCallback(token, context.query.id, "缺少消息文本");
      return { handled: true };
    }

    const messageId = context.query.message?.message_id
      ? String(context.query.message.message_id)
      : createId("tgcb");
    const eventId = createId("evt");
    const job: QueueMessageBody = {
      type: "inbound.message",
      eventId,
      agentId: context.agentId,
      message: {
        id: createId("msg"),
        platform: "telegram",
        platformMessageId: `callback:${messageId}:${callback.id}`,
        agentId: context.agentId,
        conversationId: callback.conversationId,
        sender: {
          platformUserId: String(context.query.from.id),
          displayName: context.query.from.username ?? context.query.from.first_name,
          role: "unknown"
        },
        kind: text.startsWith("/") ? "command" : "event",
        text,
        attachments: [],
        rawRef: `telegram:callback:${callback.id}`,
        receivedAt: nowIso()
      },
      receivedAt: nowIso()
    };

    await env.AGENT_QUEUE.send(job);
    await answerCallback(token, context.query.id, "已发送");
    return { handled: true, eventId };
  }

  await answerCallback(token, context.query.id, "未知按钮动作");
  return { handled: true };
}

async function answerCallback(
  token: string | undefined,
  callbackQueryId: string,
  text: string
): Promise<void> {
  if (!token) {
    return;
  }

  await answerTelegramCallbackQuery(token, callbackQueryId, { text }).catch(() => undefined);
}

function parsePayload(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringPayload(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value ? value : undefined;
}

function findButtonLabel(
  context: TelegramCallbackContext,
  callbackId: string
): string | undefined {
  const rows = context.query.message?.reply_markup?.inline_keyboard ?? [];
  for (const row of rows) {
    for (const button of row) {
      if (button.callback_data === callbackId && button.text) {
        return button.text;
      }
    }
  }

  return undefined;
}
