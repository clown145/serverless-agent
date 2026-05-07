import { describe, expect, it } from "vitest";
import { listMessagesSchema } from "../../src/worker/routes/messages/message-schemas";

describe("message schemas", () => {
  it("defaults WebUI conversation query options", () => {
    expect(listMessagesSchema.parse({})).toEqual({
      conversationId: "webui:default",
      limit: 50
    });
  });

  it("validates supported platforms", () => {
    expect(listMessagesSchema.parse({ platform: "webui" }).platform).toBe("webui");
    expect(() => listMessagesSchema.parse({ platform: "discord" })).toThrow();
  });
});
