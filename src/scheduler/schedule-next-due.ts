import type { ScheduleRecord } from "../storage/repositories/schedules-repository";
import { computeNextRecurringDueAt } from "./schedule-time";

export function computeNextDueAfterDispatch(
  schedule: ScheduleRecord,
  scheduledTime: string
): string | undefined {
  if (!schedule.intervalSeconds) {
    return undefined;
  }

  const recurrenceDueAt = schedule.recurrenceDueAt ?? schedule.dueAt;
  if (Date.parse(recurrenceDueAt) > Date.parse(scheduledTime)) {
    return recurrenceDueAt;
  }

  return computeNextRecurringDueAt(
    new Date(recurrenceDueAt),
    schedule.intervalSeconds,
    new Date(scheduledTime)
  );
}
