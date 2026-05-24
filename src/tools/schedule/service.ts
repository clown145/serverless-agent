import { enqueueScheduleFire } from "../../scheduler/schedule-dispatch";
import {
  createScheduleExecutionProfile,
  stringifyScheduleExecutionProfile
} from "../../scheduler/execution-profile";
import { stringifySchedulePayload } from "../../scheduler/schedule-payload";
import { resolveDueAt } from "../../scheduler/schedule-time";
import { nowIso } from "../../shared/time";
import type { Platform, SenderRole } from "../../shared/types/internal-message";
import {
  cancelSchedule,
  createSchedule,
  getSchedule,
  listSchedules,
  markScheduleManualDispatch,
  pauseSchedule,
  resumeSchedule,
  type ScheduleRecord
} from "../../storage/repositories/schedules-repository";
import type { ToolExecutionContext } from "../types";
import type { CreateScheduleInput, ListSchedulesInput } from "./schema";

export async function createScheduleFromTool(
  context: ToolExecutionContext,
  input: CreateScheduleInput
): Promise<ScheduleRecord> {
  const dueAt = resolveDueAt(new Date(), {
    dueAt: input.dueAt,
    delaySeconds: input.delaySeconds
  });
  const title = input.title ?? input.text.slice(0, 80);
  const platform = input.platform ?? normalizePlatform(context.platform);
  const conversationId = input.conversationId ?? context.conversationId;
  const actorRole = normalizeActorRole(context.actorRole);

  return createSchedule(context.env.AGENT_DB, {
    agentId: context.agentId,
    title,
    dueAt,
    intervalSeconds: input.intervalSeconds,
    platform,
    conversationId,
    actorId: context.actorId,
    actorRole,
    modelProviderId: input.modelProviderId,
    modelId: input.modelId,
    maxAttempts: input.maxAttempts,
    retryDelaySeconds: input.retryDelaySeconds,
    executionProfileJson: stringifyScheduleExecutionProfile(
      createScheduleExecutionProfile({
        createdByActorId: context.actorId,
        createdByActorRole: actorRole,
        createdFromPlatform: platform,
        createdFromConversationId: conversationId,
        createdFromRunId: context.runId,
        modelProviderId: input.modelProviderId,
        modelId: input.modelId
      })
    ),
    payloadJson: stringifySchedulePayload({
      title,
      text: input.text,
      platform,
      conversationId,
      actorId: context.actorId,
      actorRole,
      modelProviderId: input.modelProviderId,
      modelId: input.modelId
    })
  });
}

export async function listSchedulesForTool(
  context: ToolExecutionContext,
  input: ListSchedulesInput
): Promise<ScheduleRecord[]> {
  const schedules = await listSchedules(context.env.AGENT_DB, context.agentId);
  const allowedStatuses = input.statuses?.length ? new Set(input.statuses) : undefined;

  return schedules
    .filter((schedule) => !allowedStatuses || allowedStatuses.has(schedule.status))
    .slice(0, input.limit);
}

export async function pauseScheduleFromTool(
  context: ToolExecutionContext,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  const existing = await getOwnedSchedule(context, scheduleId);
  if (!existing) {
    return undefined;
  }

  return pauseSchedule(context.env.AGENT_DB, scheduleId);
}

export async function resumeScheduleFromTool(
  context: ToolExecutionContext,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  const existing = await getOwnedSchedule(context, scheduleId);
  if (!existing) {
    return undefined;
  }

  return resumeSchedule(context.env.AGENT_DB, scheduleId);
}

export async function cancelScheduleFromTool(
  context: ToolExecutionContext,
  scheduleId: string
): Promise<boolean> {
  const existing = await getOwnedSchedule(context, scheduleId);
  if (!existing) {
    return false;
  }

  return cancelSchedule(context.env.AGENT_DB, scheduleId);
}

export async function runScheduleNowFromTool(
  context: ToolExecutionContext,
  scheduleId: string
): Promise<{ schedule: ScheduleRecord; eventId: string } | undefined> {
  const schedule = await getOwnedSchedule(context, scheduleId);
  if (!schedule || schedule.status === "cancelled") {
    return undefined;
  }

  const dispatchedAt = nowIso();
  const updated = await markScheduleManualDispatch(context.env.AGENT_DB, scheduleId, dispatchedAt);
  const job = await enqueueScheduleFire(context.env, updated ?? schedule, {
    scheduledTime: dispatchedAt,
    receivedAt: dispatchedAt
  });

  return { schedule: updated ?? schedule, eventId: job.eventId };
}

async function getOwnedSchedule(
  context: ToolExecutionContext,
  scheduleId: string
): Promise<ScheduleRecord | undefined> {
  const schedule = await getSchedule(context.env.AGENT_DB, scheduleId);
  if (!schedule || schedule.agentId !== context.agentId) {
    return undefined;
  }

  return schedule;
}

function normalizePlatform(platform: string | undefined): Platform | undefined {
  if (
    platform === "telegram" ||
    platform === "qq" ||
    platform === "webhook" ||
    platform === "admin" ||
    platform === "webui"
  ) {
    return platform;
  }

  return undefined;
}

function normalizeActorRole(role: string | undefined): SenderRole {
  if (role === "owner" || role === "admin" || role === "member" || role === "unknown") {
    return role;
  }

  return "unknown";
}
