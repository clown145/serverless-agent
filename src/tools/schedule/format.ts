import type { SchedulePayload } from "../../scheduler/schedule-payload";
import { parseSchedulePayload } from "../../scheduler/schedule-payload";
import type { ScheduleRecord } from "../../storage/repositories/schedules-repository";

export type ScheduleToolSummary = {
  id: string;
  status: ScheduleRecord["status"];
  title?: string;
  dueAt: string;
  intervalSeconds?: number;
  platform?: string;
  conversationId?: string;
  modelProviderId?: string;
  modelId?: string;
  maxAttempts: number;
  attemptCount: number;
  retryDelaySeconds: number;
  lastRunAt?: string;
  lastRunId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  text?: string;
};

export function toScheduleToolSummary(
  schedule: ScheduleRecord,
  options: { includeText?: boolean } = {}
): ScheduleToolSummary {
  const payload = parsePayloadOrUndefined(schedule.payloadJson);
  const includeText = options.includeText ?? true;

  return {
    id: schedule.id,
    status: schedule.status,
    title: schedule.title ?? payload?.title,
    dueAt: schedule.dueAt,
    intervalSeconds: schedule.intervalSeconds,
    platform: schedule.platform ?? payload?.platform,
    conversationId: schedule.conversationId ?? payload?.conversationId,
    modelProviderId: schedule.modelProviderId ?? payload?.modelProviderId,
    modelId: schedule.modelId ?? payload?.modelId,
    maxAttempts: schedule.maxAttempts,
    attemptCount: schedule.attemptCount,
    retryDelaySeconds: schedule.retryDelaySeconds,
    lastRunAt: schedule.lastRunAt,
    lastRunId: schedule.lastRunId,
    lastError: schedule.lastError,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    text: includeText ? payload?.text : undefined
  };
}

function parsePayloadOrUndefined(payloadJson: string): SchedulePayload | undefined {
  try {
    return parseSchedulePayload(payloadJson);
  } catch {
    return undefined;
  }
}
