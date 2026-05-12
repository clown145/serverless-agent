import type { TelegramCallbackQuery } from "../types";

export type TelegramCallbackHandlerResult = {
  handled: boolean;
  eventId?: string;
};

export type TelegramCallbackContext = {
  agentId: string;
  query: TelegramCallbackQuery;
};
