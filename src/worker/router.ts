import type { Env } from "../shared/types/env";
import { errorResponse, jsonResponse } from "../shared/http";
import { handleAdminHeartbeats } from "./routes/admin-heartbeats";
import { handleAdminMessage } from "./routes/admin-message";
import { handleAdminPendingActionConfirm } from "./routes/admin-pending-action-confirm";
import { handleAdminPendingActions } from "./routes/admin-pending-actions";
import { handleAdminPermissionPolicies } from "./routes/admin-permission-policies";
import { handleAdminPermissionPolicyDetail } from "./routes/admin-permission-policy-detail";
import { handleAdminRunDetail } from "./routes/admin-run-detail";
import { handleAdminScheduleDetail } from "./routes/admin-schedule-detail";
import { handleAdminSchedules } from "./routes/admin-schedules";
import { handleAdminSkillDetail } from "./routes/admin-skill-detail";
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
        "/admin/permission-policies",
        "/admin/pending-actions",
        "/admin/schedules",
        "/admin/schedules/:scheduleId",
        "/admin/heartbeats",
        "/admin/runs/:runId",
        "/admin/skills/:skillId",
        "/admin/vfs"
      ]
    });
  }

  return errorResponse(404, "not_found", "Route not found");
}
