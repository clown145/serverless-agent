import type { Env } from "../../shared/types/env";
import { handleHealth } from "./health";
import { handleQqOfficialWebhook } from "./qq-official-webhook";
import { handleTelegramWebhook } from "./telegram-webhook";
import { handleWecomWebhook } from "./wecom-webhook";

export async function handlePublicRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | undefined> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return handleHealth();
  }

  if (request.method === "POST" && url.pathname === "/webhooks/telegram") {
    return handleTelegramWebhook(request, env, ctx);
  }

  if (url.pathname.startsWith("/webhooks/wecom/")) {
    const webhookSecret = decodeURIComponent(url.pathname.replace("/webhooks/wecom/", ""));
    return handleWecomWebhook(request, env, ctx, webhookSecret);
  }

  if (url.pathname.startsWith("/webhooks/qq-official/")) {
    const webhookSecret = decodeURIComponent(url.pathname.replace("/webhooks/qq-official/", ""));
    return handleQqOfficialWebhook(request, env, webhookSecret);
  }

  return undefined;
}
