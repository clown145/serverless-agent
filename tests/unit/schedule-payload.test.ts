import { describe, expect, it } from "vitest";
import {
  parseSchedulePayload,
  stringifySchedulePayload
} from "../../src/scheduler/schedule-payload";

describe("schedule payload", () => {
  it("round trips text payloads", () => {
    const value = stringifySchedulePayload({
      text: "/ping",
      conversationId: "admin:schedule"
    });

    expect(parseSchedulePayload(value)).toEqual({
      text: "/ping",
      conversationId: "admin:schedule"
    });
  });
});
