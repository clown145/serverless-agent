import type { Env } from "../shared/types/env";
import { errorResponse, jsonResponse } from "../shared/http";
import { handleAdminMessage } from "./routes/admin-message";
import { handleAdminRunDetail } from "./routes/admin-run-detail";
import { handleAdminVfs } from "./routes/admin-vfs";
import { handleHealth } from "./routes/health";
import { handleTelegramWebhook } from "./routes/telegram-webhook";

export async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return handleHealth();
  }

  if (request.method === "POST" && url.pathname === "/webhooks/telegram") {
    return handleTelegramWebhook(request, env, ctx);
  }

  if (request.method === "POST" && url.pathname === "/admin/messages") {
    return handleAdminMessage(request, env, ctx);
  }

  if (request.method === "GET" && url.pathname.startsWith("/admin/runs/")) {
    return handleAdminRunDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/runs/", ""))
    );
  }

  if (url.pathname === "/admin/vfs") {
    return handleAdminVfs(request, env);
  }

  if (request.method === "GET" && url.pathname === "/") {
    return jsonResponse({
      ok: true,
      service: "serverless-agent",
      routes: [
        "/health",
        "/webhooks/telegram",
        "/admin/messages",
        "/admin/runs/:runId",
        "/admin/vfs"
      ]
    });
  }

  return errorResponse(404, "not_found", "Route not found");
}
