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
import {
  answerTelegramCallbackQuery,
  editTelegramMessageReplyMarkup,
  editTelegramMessageText
} from "../outbound";
import { parseTelegramButtonOptions, type TelegramCallbackButtonOptions } from "../inline-keyboard";
import type { TelegramCallbackContext, TelegramCallbackHandlerResult } from "./types";

export async function handleTelegramCallbackQuery(
  env: Env,
  context: TelegramCallbackContext,
  token: string | undefined
): Promise<TelegramCallbackHandlerResult> {
  const callbackId = context.query.data;
  if (!callbackId) {
    await answerCallback(token, context.query.id, "Missing callback data");
    return { handled: true };
  }

  const callback = await getPlatformCallback(env.AGENT_DB, callbackId);
  if (!callback || callback.agentId !== context.agentId || callback.platform !== "telegram") {
    await answerCallback(token, context.query.id, "Button is no longer valid");
    return { handled: true };
  }

  if (callback.status !== "active") {
    await answerCallback(token, context.query.id, "Button was already used");
    return { handled: true };
  }

  if (new Date(callback.expiresAt).getTime() < Date.now()) {
    await expirePlatformCallback(env.AGENT_DB, callback.id);
    await answerCallback(token, context.query.id, "Button expired");
    return { handled: true };
  }

  const payload = parsePayload(callback.payloadJson);
  const buttonOptions = parseTelegramButtonOptions(payload);

  if (callback.action === "pending.confirm") {
    const actionId = stringPayload(payload, "actionId");
    if (!actionId) {
      await answerCallback(token, context.query.id, "Missing confirmation ID");
      return { handled: true };
    }

    const result = await confirmPendingAction(env, actionId);
    if (result.ok) {
      await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
      await applyTelegramButtonEffects(token, context, buttonOptions);
    }
    await answerCallback(
      token,
      context.query.id,
      result.ok ? (buttonOptions.answerText ?? "Confirmed") : result.message,
      {
        showAlert: buttonOptions.showAlert
      }
    );
    return { handled: true };
  }

  if (callback.action === "pending.reject") {
    const actionId = stringPayload(payload, "actionId");
    if (!actionId) {
      await answerCallback(token, context.query.id, "Missing confirmation ID");
      return { handled: true };
    }

    const result = await rejectPendingAction(env, actionId);
    if (result.ok) {
      await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
      await applyTelegramButtonEffects(token, context, buttonOptions);
    }
    await answerCallback(
      token,
      context.query.id,
      result.ok ? (buttonOptions.answerText ?? "Rejected") : result.message,
      {
        showAlert: buttonOptions.showAlert
      }
    );
    return { handled: true };
  }

  if (callback.action === "agent.message") {
    if (!buttonOptions.reuse) {
      await markPlatformCallbackUsed(env.AGENT_DB, callback.id);
    }
    if (buttonOptions.silent) {
      await applyTelegramButtonEffects(token, context, buttonOptions);
      await answerCallback(token, context.query.id, buttonOptions.answerText ?? "Handled", {
        showAlert: buttonOptions.showAlert
      });
      return { handled: true };
    }

    const text =
      stringPayload(payload, "text") ??
      stringPayload(payload, "message") ??
      stringPayload(payload, "buttonLabel") ??
      findButtonLabel(context, callback.id);
    if (!text) {
      await answerCallback(token, context.query.id, "Missing message text");
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
    await applyTelegramButtonEffects(token, context, buttonOptions);
    await answerCallback(token, context.query.id, buttonOptions.answerText ?? "Sent", {
      showAlert: buttonOptions.showAlert
    });
    return { handled: true, eventId };
  }

  await answerCallback(token, context.query.id, "Unknown button action");
  return { handled: true };
}

async function answerCallback(
  token: string | undefined,
  callbackQueryId: string,
  text: string,
  options: { showAlert?: boolean } = {}
): Promise<void> {
  if (!token) {
    return;
  }

  await answerTelegramCallbackQuery(token, callbackQueryId, {
    text,
    showAlert: options.showAlert
  }).catch(() => undefined);
}

async function applyTelegramButtonEffects(
  token: string | undefined,
  context: TelegramCallbackContext,
  options: TelegramCallbackButtonOptions
): Promise<void> {
  if (!token || (!options.editMessageText && !options.removeKeyboardOnClick)) {
    return;
  }

  const message = context.query.message;
  const target = {
    chatId: message?.chat.id,
    messageId: message?.message_id,
    inlineMessageId: context.query.inline_message_id
  };

  if (!target.inlineMessageId && (!target.chatId || !target.messageId)) {
    return;
  }

  if (options.editMessageText) {
    const edited = await editTelegramMessageText(token, {
      ...target,
      text: options.editMessageText,
      replyMarkup: options.removeKeyboardOnClick ? { inline_keyboard: [] } : message?.reply_markup
    }).then(
      () => true,
      () => false
    );

    if (edited || !options.removeKeyboardOnClick) {
      return;
    }
  }

  await editTelegramMessageReplyMarkup(token, target).catch(() => undefined);
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

function findButtonLabel(context: TelegramCallbackContext, callbackId: string): string | undefined {
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
