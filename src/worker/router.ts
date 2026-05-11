import type { Env } from "../shared/types/env";
import { errorResponse, jsonResponse } from "../shared/http";
import {
  handleAdminConversationDetail,
  handleAdminConversations
} from "./routes/admin-conversations";
import { handleAdminDiagnostics } from "./routes/admin-diagnostics";
import { handleAdminMessageAttachment } from "./routes/admin-message-attachment";
import { handleAdminHeartbeats } from "./routes/admin-heartbeats";
import { handleAdminMessage } from "./routes/admin-message";
import { handleAdminMcpServerDetail } from "./routes/admin-mcp-server-detail";
import { handleAdminMcpServers } from "./routes/admin-mcp-servers";
import { handleAdminMcpToolDetail } from "./routes/admin-mcp-tool-detail";
import {
  handleAdminModelCatalogDetail,
  handleAdminModelProviderDetail,
  handleAdminModelSettings
} from "./routes/admin-model-settings";
import { handleAdminDebugMessages } from "./routes/admin-debug-messages";
import { handleAdminPendingActionConfirm } from "./routes/admin-pending-action-confirm";
import { handleAdminPendingActions } from "./routes/admin-pending-actions";
import { handleAdminPermissionPolicies } from "./routes/admin-permission-policies";
import { handleAdminPermissionPolicyDetail } from "./routes/admin-permission-policy-detail";
import { handleAdminRunDetail } from "./routes/admin-run-detail";
import { handleAdminRuns } from "./routes/admin-runs";
import { handleAdminScheduleDetail } from "./routes/admin-schedule-detail";
import { handleAdminSchedules } from "./routes/admin-schedules";
import { handleAdminSearchProviderDetail } from "./routes/admin-search-provider-detail";
import { handleAdminSearchProviders } from "./routes/admin-search-providers";
import { handleAdminSkillDetail } from "./routes/admin-skill-detail";
import { handleAdminSetupStatus } from "./routes/admin-setup-status";
import { handleAdminTelegramIntegrationDetail } from "./routes/admin-telegram-integration-detail";
import { handleAdminTelegramIntegrations } from "./routes/admin-telegram-integrations";
import { handleAdminToolCall } from "./routes/admin-tool-call";
import { handleAdminToolCalls } from "./routes/admin-tool-calls";
import { handleAdminTools } from "./routes/admin-tools";
import { handleAdminUi } from "./routes/admin-ui";
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

  if (url.pathname === "/admin/messages") {
    return handleAdminMessage(request, env, ctx);
  }

  if (url.pathname.startsWith("/admin/messages/")) {
    const match = url.pathname.match(/^\/admin\/messages\/([^/]+)\/attachments\/([^/]+)$/);
    if (match) {
      return handleAdminMessageAttachment(request, env, {
        messageId: decodeURIComponent(match[1]),
        attachmentId: decodeURIComponent(match[2])
      });
    }
  }

  if (url.pathname === "/admin/conversations") {
    return handleAdminConversations(request, env);
  }

  if (url.pathname.startsWith("/admin/conversations/")) {
    const conversationPath = url.pathname.replace("/admin/conversations/", "");
    const conversationId = decodeURIComponent(
      conversationPath.replace(/\/compact$/, "")
    );
    return handleAdminConversationDetail(request, env, conversationId);
  }

  if (request.method === "GET" && url.pathname === "/admin/setup/status") {
    return handleAdminSetupStatus(request, env);
  }

  if (request.method === "GET" && url.pathname === "/admin/diagnostics") {
    return handleAdminDiagnostics(request, env);
  }

  if (url.pathname === "/admin/debug/messages") {
    return handleAdminDebugMessages(request, env);
  }

  if (url.pathname === "/admin/platforms/telegram") {
    return handleAdminTelegramIntegrations(request, env);
  }

  if (url.pathname.startsWith("/admin/platforms/telegram/")) {
    const telegramPath = url.pathname.replace("/admin/platforms/telegram/", "");
    const integrationId = decodeURIComponent(telegramPath.split("/")[0] ?? "");
    return handleAdminTelegramIntegrationDetail(request, env, integrationId);
  }

  if (request.method === "GET" && url.pathname === "/admin/tools") {
    return handleAdminTools(request, env);
  }

  if (url.pathname === "/admin/tools/call") {
    return handleAdminToolCall(request, env);
  }

  if (url.pathname === "/admin/tools/calls") {
    return handleAdminToolCalls(request, env);
  }

  if (url.pathname === "/admin/mcp/servers") {
    return handleAdminMcpServers(request, env);
  }

  if (url.pathname.startsWith("/admin/mcp/servers/")) {
    const mcpServerPath = url.pathname.replace("/admin/mcp/servers/", "");
    const serverId = decodeURIComponent(mcpServerPath.split("/")[0] ?? "");
    return handleAdminMcpServerDetail(request, env, serverId);
  }

  if (url.pathname.startsWith("/admin/mcp/tools/")) {
    const toolId = decodeURIComponent(url.pathname.replace("/admin/mcp/tools/", ""));
    return handleAdminMcpToolDetail(request, env, toolId);
  }

  if (url.pathname === "/admin/model-settings") {
    return handleAdminModelSettings(request, env);
  }

  if (url.pathname.startsWith("/admin/model-catalog/")) {
    const modelCatalogId = decodeURIComponent(url.pathname.replace("/admin/model-catalog/", ""));
    return handleAdminModelCatalogDetail(request, env, modelCatalogId);
  }

  if (url.pathname === "/admin/search-providers") {
    return handleAdminSearchProviders(request, env);
  }

  if (url.pathname.startsWith("/admin/search-providers/")) {
    const searchProviderPath = url.pathname.replace("/admin/search-providers/", "");
    const providerId = decodeURIComponent(searchProviderPath.split("/")[0] ?? "");
    return handleAdminSearchProviderDetail(request, env, providerId);
  }

  if (url.pathname.startsWith("/admin/model-providers/")) {
    const modelProviderPath = url.pathname.replace("/admin/model-providers/", "");
    const providerId = decodeURIComponent(modelProviderPath.split("/")[0] ?? "");
    return handleAdminModelProviderDetail(request, env, providerId);
  }

  if (request.method === "GET" && (url.pathname === "/ui" || url.pathname.startsWith("/ui/"))) {
    return handleAdminUi(request, env);
  }

  if (url.pathname === "/admin/permission-policies") {
    return handleAdminPermissionPolicies(request, env);
  }

  if (url.pathname.startsWith("/admin/permission-policies/")) {
    return handleAdminPermissionPolicyDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/permission-policies/", ""))
    );
  }

  if (request.method === "GET" && url.pathname === "/admin/pending-actions") {
    return handleAdminPendingActions(request, env);
  }

  if (url.pathname.startsWith("/admin/pending-actions/")) {
    const actionPath = url.pathname.replace("/admin/pending-actions/", "");
    if (actionPath.endsWith("/confirm")) {
      return handleAdminPendingActionConfirm(
        request,
        env,
        decodeURIComponent(actionPath.replace("/confirm", ""))
      );
    }
  }

  if (url.pathname === "/admin/schedules") {
    return handleAdminSchedules(request, env);
  }

  if (url.pathname.startsWith("/admin/schedules/")) {
    return handleAdminScheduleDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/schedules/", ""))
    );
  }

  if (request.method === "GET" && url.pathname === "/admin/heartbeats") {
    return handleAdminHeartbeats(request, env);
  }

  if (request.method === "GET" && url.pathname === "/admin/runs") {
    return handleAdminRuns(request, env);
  }

  if (request.method === "GET" && url.pathname.startsWith("/admin/runs/")) {
    return handleAdminRunDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/runs/", ""))
    );
  }

  if (request.method === "GET" && url.pathname.startsWith("/admin/skills/")) {
    return handleAdminSkillDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/skills/", ""))
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
        "/admin/messages/:messageId/attachments/:attachmentId",
        "/admin/conversations",
        "/admin/conversations/:conversationId",
        "/admin/conversations/:conversationId/compact",
        "/admin/setup/status",
        "/admin/diagnostics",
        "/admin/debug/messages",
        "/admin/platforms/telegram",
        "/admin/platforms/telegram/:integrationId/test",
        "/admin/platforms/telegram/:integrationId/webhook",
        "/admin/tools",
        "/admin/tools/call",
        "/admin/tools/calls",
        "/admin/mcp/servers",
        "/admin/mcp/servers/:serverId/discover",
        "/admin/mcp/tools/:toolId",
        "/admin/model-settings",
        "/admin/model-catalog/:modelCatalogId",
        "/admin/model-providers/:providerId/refresh",
        "/admin/model-providers/:providerId/test",
        "/admin/search-providers",
        "/admin/search-providers/:providerId/test",
        "/admin/permission-policies",
        "/admin/pending-actions",
        "/admin/schedules",
        "/admin/schedules/:scheduleId",
        "/admin/heartbeats",
        "/admin/runs",
        "/admin/runs/:runId",
        "/admin/skills/:skillId",
        "/admin/vfs",
        "/ui"
      ]
    });
  }

  return errorResponse(404, "not_found", "Route not found");
}
