import type { Env } from "../../shared/types/env";
import { handleAdminConversationDetail, handleAdminConversations } from "./admin-conversations";
import { handleAdminDebugMessages } from "./admin-debug-messages";
import { handleAdminDiagnostics } from "./admin-diagnostics";
import { handleAdminHeartbeats } from "./admin-heartbeats";
import { handleAdminMcpServerDetail } from "./admin-mcp-server-detail";
import { handleAdminMcpServers } from "./admin-mcp-servers";
import { handleAdminMcpToolDetail } from "./admin-mcp-tool-detail";
import { handleAdminMessage } from "./admin-message";
import { handleAdminMessageAttachment } from "./admin-message-attachment";
import {
  handleAdminModelCatalogDetail,
  handleAdminModelProviderDetail,
  handleAdminModelSettings
} from "./admin-model-settings";
import { handleAdminModelRoleSettings } from "./admin-model-role-settings";
import { handleAdminPendingActionConfirm } from "./admin-pending-action-confirm";
import { handleAdminPendingActions } from "./admin-pending-actions";
import { handleAdminPermissionPolicies } from "./admin-permission-policies";
import { handleAdminPermissionPolicyDetail } from "./admin-permission-policy-detail";
import { handleAdminQqOfficialIntegrationDetail } from "./admin-qq-official-integration-detail";
import { handleAdminQqOfficialIntegrations } from "./admin-qq-official-integrations";
import { handleAdminRunDetail } from "./admin-run-detail";
import { handleAdminRuns } from "./admin-runs";
import { handleAdminScheduleDetail } from "./admin-schedule-detail";
import { handleAdminSchedules } from "./admin-schedules";
import { handleAdminSearchProviderDetail } from "./admin-search-provider-detail";
import { handleAdminSearchProviders } from "./admin-search-providers";
import { handleAdminSetupStatus } from "./admin-setup-status";
import { handleAdminSkillDetail } from "./admin-skill-detail";
import { handleAdminSkillFiles } from "./admin-skill-files";
import { handleAdminSkillRevisions } from "./admin-skill-revisions";
import { handleAdminSkillSettings } from "./admin-skill-settings";
import { handleAdminSkills } from "./admin-skills";
import { handleAdminTelegramIntegrationDetail } from "./admin-telegram-integration-detail";
import { handleAdminTelegramIntegrations } from "./admin-telegram-integrations";
import { handleAdminToolCall } from "./admin-tool-call";
import { handleAdminToolCalls } from "./admin-tool-calls";
import { handleAdminTools } from "./admin-tools";
import { handleAdminUi } from "./admin-ui";
import { handleAdminVfs } from "./admin-vfs";
import { handleAdminWecomIntegrationDetail } from "./admin-wecom-integration-detail";
import { handleAdminWecomIntegrations } from "./admin-wecom-integrations";
import { handleAdminWeixinOcIntegrationDetail } from "./admin-weixin-oc-integration-detail";
import { handleAdminWeixinOcIntegrations } from "./admin-weixin-oc-integrations";
import {
  handleQqOfficialGatewayAdmin,
  handleQqOfficialGatewayConnectAll
} from "./qq-official-gateway";

export async function handleAdminRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | undefined> {
  const url = new URL(request.url);

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
    const conversationId = decodeURIComponent(conversationPath.replace(/\/compact$/, ""));
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

  if (url.pathname === "/admin/platforms/qq-official") {
    return handleAdminQqOfficialIntegrations(request, env);
  }

  if (url.pathname.startsWith("/admin/platforms/qq-official-integrations/")) {
    const qqOfficialPath = url.pathname.replace("/admin/platforms/qq-official-integrations/", "");
    const integrationId = decodeURIComponent(qqOfficialPath.split("/")[0] ?? "");
    return handleAdminQqOfficialIntegrationDetail(request, env, integrationId);
  }

  if (request.method === "POST" && url.pathname === "/admin/platforms/qq-official/connect-all") {
    return handleQqOfficialGatewayConnectAll(env);
  }

  if (url.pathname.startsWith("/admin/platforms/qq-official/")) {
    return handleQqOfficialGatewayAdmin(request, env);
  }

  if (url.pathname === "/admin/platforms/wecom") {
    return handleAdminWecomIntegrations(request, env);
  }

  if (url.pathname.startsWith("/admin/platforms/wecom-integrations/")) {
    const wecomPath = url.pathname.replace("/admin/platforms/wecom-integrations/", "");
    const integrationId = decodeURIComponent(wecomPath.split("/")[0] ?? "");
    return handleAdminWecomIntegrationDetail(request, env, integrationId);
  }

  if (url.pathname === "/admin/platforms/weixin-oc") {
    return handleAdminWeixinOcIntegrations(request, env);
  }

  if (url.pathname.startsWith("/admin/platforms/weixin-oc-integrations/")) {
    const weixinOcPath = url.pathname.replace("/admin/platforms/weixin-oc-integrations/", "");
    const integrationId = decodeURIComponent(weixinOcPath.split("/")[0] ?? "");
    return handleAdminWeixinOcIntegrationDetail(request, env, integrationId);
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

  if (url.pathname === "/admin/model-role-settings") {
    return handleAdminModelRoleSettings(request, env);
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

  if (url.pathname === "/admin/skills") {
    return handleAdminSkills(request, env);
  }

  if (url.pathname === "/admin/skills/settings") {
    return handleAdminSkillSettings(request, env);
  }

  const skillFilesMatch = url.pathname.match(/^\/admin\/skills\/([^/]+)\/files$/);
  if (skillFilesMatch) {
    return handleAdminSkillFiles(request, env, decodeURIComponent(skillFilesMatch[1]));
  }

  const skillRevisionMatch = url.pathname.match(
    /^\/admin\/skills\/([^/]+)\/revisions(?:\/(\d+))?$/
  );
  if (skillRevisionMatch) {
    return handleAdminSkillRevisions(
      request,
      env,
      decodeURIComponent(skillRevisionMatch[1]),
      skillRevisionMatch[2] ? Number(skillRevisionMatch[2]) : undefined
    );
  }

  if (url.pathname.startsWith("/admin/skills/")) {
    return handleAdminSkillDetail(
      request,
      env,
      decodeURIComponent(url.pathname.replace("/admin/skills/", ""))
    );
  }

  if (url.pathname === "/admin/vfs") {
    return handleAdminVfs(request, env);
  }

  return undefined;
}
