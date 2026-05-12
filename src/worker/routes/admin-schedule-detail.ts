import { errorResponse, jsonResponse } from "../../shared/http";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import { enqueueScheduleFire } from "../../scheduler/schedule-dispatch";
import {
  cancelSchedule,
  getSchedule,
  markScheduleManualDispatch,
  pauseSchedule,
  resumeSchedule
} from "../../storage/repositories/schedules-repository";
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

  const [id = "", action] = scheduleId.split("/");
  if (!id) {
    return errorResponse(404, "schedule_not_found", "Schedule not found");
  }

  if (request.method === "DELETE" && !action) {
    const cancelled = await cancelSchedule(env.AGENT_DB, id);
    if (!cancelled) {
      return errorResponse(404, "schedule_not_found", "Schedule not found");
    }

    return jsonResponse({ ok: true, cancelled: true });
  }

  if (request.method === "POST" && action === "pause") {
    const existing = await getSchedule(env.AGENT_DB, id);
    if (!existing) {
      return errorResponse(404, "schedule_not_found", "Schedule not found");
    }

    const schedule = await pauseSchedule(env.AGENT_DB, id);
    return jsonResponse({ ok: true, schedule });
  }

  if (request.method === "POST" && action === "resume") {
    const existing = await getSchedule(env.AGENT_DB, id);
    if (!existing) {
      return errorResponse(404, "schedule_not_found", "Schedule not found");
    }

    const schedule = await resumeSchedule(env.AGENT_DB, id);
    return jsonResponse({ ok: true, schedule });
  }

  if (request.method === "POST" && action === "run") {
    const schedule = await getSchedule(env.AGENT_DB, id);
    if (!schedule || schedule.status === "cancelled") {
      return errorResponse(404, "schedule_not_found", "Schedule not found");
    }

    const dispatchedAt = nowIso();
    const updated = await markScheduleManualDispatch(env.AGENT_DB, id, dispatchedAt);
    const job = await enqueueScheduleFire(env, updated ?? schedule, {
      scheduledTime: dispatchedAt,
      receivedAt: dispatchedAt
    });
    return jsonResponse({ ok: true, schedule: updated ?? schedule, eventId: job.eventId });
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}
