import { describe, expect, it } from "vitest";
import { mapMessageRow } from "../../src/storage/repositories/message-types";

describe("message types", () => {
  it("maps agent sender ids to assistant messages", () => {
    expect(
      mapMessageRow({
        id: "msg-1",
        agent_id: "default",
        conversation_id: "webui:default",
        platform: "webui",
        platform_message_id: "msg-1",
        sender_id: "agent:default",
        kind: "text",
        text: "hello",
        received_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z"
      }).role
    ).toBe("assistant");
  });
});
