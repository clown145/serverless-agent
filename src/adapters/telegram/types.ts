export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_unique_id?: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramDocument = {
  file_id: string;
  file_unique_id?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  reply_markup?: TelegramInlineKeyboardMarkup;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard?: TelegramInlineKeyboardButton[][];
};

export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: {
    url: string;
  };
  copy_text?: {
    text: string;
  };
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance?: string;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};
