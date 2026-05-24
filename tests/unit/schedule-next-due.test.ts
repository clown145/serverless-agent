import { describe, expect, it } from "vitest";
import { computeNextDueAfterDispatch } from "../../src/scheduler/schedule-next-due";
import type { ScheduleRecord } from "../../src/storage/repositories/schedules-repository";

describe("schedule next due", () => {
  it("does not drift recurring schedules by scan time", () => {
    const schedule = scheduleRecord({
      dueAt: "2026-05-01T00:00:00.000Z",
      recurrenceDueAt: "2026-05-01T00:00:00.000Z",
      intervalSeconds: 300
    });

    expect(computeNextDueAfterDispatch(schedule, "2026-05-01T00:07:00.000Z")).toBe(
      "2026-05-01T00:10:00.000Z"
    );
  });

  it("returns to the recurrence axis after retry due time", () => {
    const schedule = scheduleRecord({
      dueAt: "2026-05-01T00:03:00.000Z",
      recurrenceDueAt: "2026-05-01T00:05:00.000Z",
      intervalSeconds: 300
    });

    expect(computeNextDueAfterDispatch(schedule, "2026-05-01T00:03:00.000Z")).toBe(
      "2026-05-01T00:05:00.000Z"
    );
  });
});

function scheduleRecord(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
  return {
    id: "sch_1",
    agentId: "default",
    status: "active",
    dueAt: "2026-05-01T00:00:00.000Z",
    intervalSeconds: undefined,
    maxAttempts: 1,
    attemptCount: 0,
    retryDelaySeconds: 300,
    payloadJson: JSON.stringify({ text: "Task" }),
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}
