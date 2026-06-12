import type {
  OutboundButton,
  OutboundButtonRow,
  OutboundCallbackButton
} from "../../platforms/outbound/types";
import type { Env } from "../../shared/types/env";
import { createPlatformCallback } from "../../storage/repositories/platform-callbacks-repository";
import type { TelegramInlineKeyboardButton } from "./types";

const BUTTON_OPTIONS_KEY = "__button";

export type TelegramCallbackButtonOptions = {
  reuse: boolean;
  answerText?: string;
  showAlert?: boolean;
  removeKeyboardOnClick?: boolean;
  editMessageText?: string;
  silent?: boolean;
};

export async function createTelegramInlineKeyboard(
  env: Env,
  input: {
    agentId: string;
    conversationId: string;
    rows: OutboundButtonRow[];
    expiresAt: string;
  }
): Promise<TelegramInlineKeyboardButton[][]> {
  return Promise.all(
    input.rows.map((row) =>
      Promise.all(row.map((button) => telegramInlineKeyboardButton(env, input, button)))
    )
  );
}

export function parseTelegramButtonOptions(
  payload: Record<string, unknown>
): TelegramCallbackButtonOptions {
  const value = payload[BUTTON_OPTIONS_KEY];
  const options =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    reuse: options.reuse === true,
    answerText: stringOption(options.answerText),
    showAlert: booleanOption(options.showAlert),
    removeKeyboardOnClick: booleanOption(options.removeKeyboardOnClick),
    editMessageText: stringOption(options.editMessageText),
    silent: booleanOption(options.silent)
  };
}

async function telegramInlineKeyboardButton(
  env: Env,
  input: {
    agentId: string;
    conversationId: string;
    expiresAt: string;
  },
  button: OutboundButton
): Promise<TelegramInlineKeyboardButton> {
  switch (button.kind) {
    case "callback":
      return createTelegramCallbackButton(env, input, button);
    case "url":
      return {
        text: button.label,
        url: button.url
      };
    case "web_app":
      return {
        text: button.label,
        web_app: {
          url: button.url
        }
      };
    case "copy_text":
      return {
        text: button.label,
        copy_text: {
          text: button.copyText
        }
      };
  }
}

async function createTelegramCallbackButton(
  env: Env,
  input: {
    agentId: string;
    conversationId: string;
    expiresAt: string;
  },
  button: OutboundCallbackButton
): Promise<TelegramInlineKeyboardButton> {
  const callback = await createPlatformCallback(env.AGENT_DB, {
    agentId: input.agentId,
    platform: "telegram",
    conversationId: input.conversationId,
    action: button.action,
    payloadJson: JSON.stringify(createTelegramCallbackPayload(button)),
    expiresAt: input.expiresAt
  });

  return {
    text: button.label,
    callback_data: callback.id
  };
}

function createTelegramCallbackPayload(button: OutboundCallbackButton): Record<string, unknown> {
  const payload = { ...(button.payload ?? {}) };
  delete payload[BUTTON_OPTIONS_KEY];
  payload.buttonLabel = button.label;

  const options = createTelegramButtonOptionsPayload(button);
  if (options) {
    payload[BUTTON_OPTIONS_KEY] = options;
  }

  return payload;
}

function createTelegramButtonOptionsPayload(
  button: OutboundCallbackButton
): Record<string, unknown> | undefined {
  const options: Record<string, unknown> = {};

  if (button.reuse === true) {
    options.reuse = true;
  }
  if (button.answerText) {
    options.answerText = button.answerText;
  }
  if (button.showAlert !== undefined) {
    options.showAlert = button.showAlert;
  }
  if (button.removeKeyboardOnClick !== undefined) {
    options.removeKeyboardOnClick = button.removeKeyboardOnClick;
  }
  if (button.editMessageText) {
    options.editMessageText = button.editMessageText;
  }
  if (button.silent !== undefined) {
    options.silent = button.silent;
  }

  return Object.keys(options).length ? options : undefined;
}

function stringOption(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function booleanOption(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
