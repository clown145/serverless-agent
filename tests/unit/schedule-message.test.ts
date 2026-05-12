import { describe, expect, it } from "vitest";
import { createScheduleMessage } from "../../src/scheduler/schedule-message";

describe("schedule message", () => {
  it("creates internal messages from schedule jobs", () => {
    const message = createScheduleMessage({
      type: "schedule.fire",
      eventId: "evt",
      agentId: "default",
      scheduleId: "sch_1",
      text: "/ping",
      platform: "telegram",
      conversationId: "telegram:789",
      actorId: "789",
      actorRole: "owner",
      modelProviderId: "mprov_1",
      modelId: "gemini-2.5-flash",
      scheduledTime: "2026-04-30T00:00:00.000Z",
      receivedAt: "2026-04-30T00:00:01.000Z"
    });

    expect(message.platform).toBe("telegram");
    expect(message.conversationId).toBe("telegram:789");
    expect(message.sender.platformUserId).toBe("789");
    expect(message.kind).toBe("command");
    expect(message.scheduleId).toBe("sch_1");
    expect(message.modelProviderId).toBe("mprov_1");
    expect(message.modelId).toBe("gemini-2.5-flash");
    expect(message.rawRef).toBe("schedule:sch_1");
  });
});
