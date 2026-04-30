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
      scheduledTime: "2026-04-30T00:00:00.000Z",
      receivedAt: "2026-04-30T00:00:01.000Z"
    });

    expect(message.platform).toBe("admin");
    expect(message.kind).toBe("command");
    expect(message.scheduleId).toBe("sch_1");
    expect(message.rawRef).toBe("schedule:sch_1");
  });
});
