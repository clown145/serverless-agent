import { describe, expect, it } from "vitest";
import { listDebugMessagesSchema } from "../../src/worker/routes/debug/debug-schemas";

describe("debug schemas", () => {
  it("validates message query filters", () => {
    expect(
      listDebugMessagesSchema.parse({
        platform: "telegram",
        limit: "20"
      })
    ).toEqual({
      platform: "telegram",
      limit: 20
    });
    expect(() => listDebugMessagesSchema.parse({ platform: "discord" })).toThrow();
  });
});
