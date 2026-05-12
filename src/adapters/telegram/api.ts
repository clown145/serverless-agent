export type TelegramApiResult<T> = {
  ok: true;
  result: T;
} | {
  ok: false;
  error_code?: number;
  description?: string;
};

export type TelegramMe = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramWebhookInfo = {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
};

export type TelegramBotCommand = {
  command: string;
  description: string;
};

export async function getTelegramMe(token: string): Promise<TelegramMe> {
  return callTelegramApi<TelegramMe>(token, "getMe");
}

export async function getTelegramWebhookInfo(
  token: string
): Promise<TelegramWebhookInfo> {
  return callTelegramApi<TelegramWebhookInfo>(token, "getWebhookInfo");
}

export async function setTelegramWebhook(input: {
  token: string;
  url: string;
  secretToken: string;
}): Promise<boolean> {
  return callTelegramApi<boolean>(input.token, "setWebhook", {
    url: input.url,
    secret_token: input.secretToken,
    allowed_updates: ["message", "edited_message", "callback_query"]
  });
}

export async function deleteTelegramWebhook(token: string): Promise<boolean> {
  return callTelegramApi<boolean>(token, "deleteWebhook", {
    drop_pending_updates: false
  });
}

export async function setTelegramBotCommands(
  token: string,
  commands: TelegramBotCommand[]
): Promise<boolean> {
  return callTelegramApi<boolean>(token, "setMyCommands", {
    commands
  });
}

export async function callTelegramMultipartApi<T>(
  token: string,
  method: string,
  body: FormData
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body
  });
  const payload = (await response.json().catch(() => undefined)) as
    | TelegramApiResult<T>
    | undefined;

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload && !payload.ok
        ? payload.description ?? `Telegram API error ${payload.error_code ?? response.status}`
        : `Telegram API error ${response.status}`
    );
  }

  return payload.result;
}

export async function callTelegramApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  const payload = (await response.json().catch(() => undefined)) as
    | TelegramApiResult<T>
    | undefined;

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload && !payload.ok
        ? payload.description ?? `Telegram API error ${payload.error_code ?? response.status}`
        : `Telegram API error ${response.status}`
    );
  }

  return payload.result;
}
