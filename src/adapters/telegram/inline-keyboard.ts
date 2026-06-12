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
  const rows: TelegramInlineKeyboardButton[][] = [];

  for (const row of input.rows) {
    rows.push(
      await Promise.all(row.map((button) => telegramInlineKeyboardButton(env, input, button)))
    );
  }

  return rows;
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
    payloadJson: JSON.stringify({
      ...button.payload,
      buttonLabel: button.label,
      [BUTTON_OPTIONS_KEY]: {
        reuse: button.reuse === true,
        answerText: button.answerText,
        showAlert: button.showAlert,
        removeKeyboardOnClick: button.removeKeyboardOnClick,
        editMessageText: button.editMessageText,
        silent: button.silent
      }
    }),
    expiresAt: input.expiresAt
  });

  return {
    text: button.label,
    callback_data: callback.id
  };
}

function stringOption(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function booleanOption(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
