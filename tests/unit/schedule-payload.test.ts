import { describe, expect, it } from "vitest";
import {
  parseSchedulePayload,
  stringifySchedulePayload
} from "../../src/scheduler/schedule-payload";

describe("schedule payload", () => {
  it("round trips text payloads", () => {
    const value = stringifySchedulePayload({
      title: "Ping",
      text: "/ping",
      platform: "telegram",
      conversationId: "telegram:789",
      actorId: "789",
      actorRole: "owner",
      modelProviderId: "mprov_1",
      modelId: "gemini-2.5-flash"
    });

    expect(parseSchedulePayload(value)).toEqual({
      title: "Ping",
      text: "/ping",
      platform: "telegram",
      conversationId: "telegram:789",
      actorId: "789",
      actorRole: "owner",
      modelProviderId: "mprov_1",
      modelId: "gemini-2.5-flash"
    });
  });
});
