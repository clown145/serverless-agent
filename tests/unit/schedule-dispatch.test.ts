import { describe, expect, it } from "vitest";
import { createScheduleFireJob } from "../../src/scheduler/schedule-dispatch";
import type { ScheduleRecord } from "../../src/storage/repositories/schedules-repository";

describe("schedule dispatch", () => {
  it("prefers schedule columns over payload fallbacks", () => {
    const job = createScheduleFireJob(
      {
        id: "sch_1",
        agentId: "default",
        status: "active",
        title: "Column title",
        dueAt: "2026-05-01T00:00:00.000Z",
        platform: "webui",
        conversationId: "webui:task",
        actorId: "scheduler",
        actorRole: "owner",
        modelProviderId: "mprov_column",
        modelId: "model-column",
        maxAttempts: 2,
        attemptCount: 0,
        retryDelaySeconds: 300,
        payloadJson: JSON.stringify({
          title: "Payload title",
          text: "Run task",
          platform: "admin",
          conversationId: "admin:task",
          modelProviderId: "mprov_payload",
          modelId: "model-payload"
        }),
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z"
      } satisfies ScheduleRecord,
      {
        scheduledTime: "2026-05-01T00:00:00.000Z",
        receivedAt: "2026-05-01T00:00:01.000Z"
      }
    );

    expect(job).toMatchObject({
      scheduleId: "sch_1",
      title: "Column title",
      text: "Run task",
      platform: "webui",
      conversationId: "webui:task",
      modelProviderId: "mprov_column",
      modelId: "model-column"
    });
  });
});
