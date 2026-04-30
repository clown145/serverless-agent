import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { cancelSchedule } from "../../storage/repositories/schedules-repository";
import { requireAdmin } from "../admin-auth";

export async function handleAdminScheduleDetail(
  request: Request,
  env: Env,
  scheduleId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "DELETE") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const cancelled = await cancelSchedule(env.AGENT_DB, scheduleId);
  if (!cancelled) {
    return errorResponse(404, "schedule_not_found", "Schedule not found");
  }

  return jsonResponse({ ok: true, cancelled: true });
}
