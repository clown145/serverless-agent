import { jsonResponse } from "../../shared/http";

const ROOT_ROUTES = [
  "/health",
  "/webhooks/telegram",
  "/webhooks/wecom/:webhookSecret",
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
  "/admin/platforms/telegram/:integrationId/commands",
  "/admin/platforms/telegram/:integrationId/webhook",
  "/admin/platforms/qq-official",
  "/admin/platforms/qq-official-integrations/:integrationId/test",
  "/admin/platforms/qq-official-integrations/:integrationId/connect",
  "/admin/platforms/qq-official-integrations/:integrationId/status",
  "/admin/platforms/qq-official/connect",
  "/admin/platforms/qq-official/disconnect",
  "/admin/platforms/qq-official/status",
  "/admin/platforms/qq-official/connect-all",
  "/admin/platforms/wecom",
  "/admin/platforms/wecom-integrations/:integrationId/test",
  "/admin/platforms/wecom-integrations/:integrationId/contact-way",
  "/admin/platforms/weixin-oc",
  "/admin/platforms/weixin-oc-integrations/:integrationId/login",
  "/admin/platforms/weixin-oc-integrations/:integrationId/connect",
  "/admin/platforms/weixin-oc-integrations/:integrationId/status",
  "/admin/tools",
  "/admin/tools/call",
  "/admin/tools/calls",
  "/admin/mcp/servers",
  "/admin/mcp/servers/:serverId/discover",
  "/admin/mcp/tools/:toolId",
  "/admin/model-settings",
  "/admin/model-role-settings",
  "/admin/model-catalog/:modelCatalogId",
  "/admin/model-providers/:providerId/refresh",
  "/admin/model-providers/:providerId/metadata",
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
  "/admin/skills",
  "/admin/skills/settings",
  "/admin/skills/:skillId",
  "/admin/skills/:skillId/files",
  "/admin/skills/:skillId/revisions",
  "/admin/skills/:skillId/revisions/:version",
  "/admin/vfs",
  "/ui"
] as const;

export function handleRootRoute(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/") {
    return undefined;
  }

  return jsonResponse({
    ok: true,
    service: "serverless-agent",
    routes: ROOT_ROUTES
  });
}
