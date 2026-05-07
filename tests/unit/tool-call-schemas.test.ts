import { describe, expect, it } from "vitest";
import {
  callToolSchema,
  listToolCallsSchema
} from "../../src/worker/routes/tools/tool-call-schemas";

describe("tool call schemas", () => {
  it("defaults optional tool call fields", () => {
    const parsed = callToolSchema.parse({
      toolName: "vfs.list_dir"
    });

    expect(parsed).toMatchObject({
      toolName: "vfs.list_dir",
      input: {},
      allowDangerous: false
    });
  });

  it("coerces and clamps history limits through validation", () => {
    expect(listToolCallsSchema.parse({ limit: "10" })).toEqual({ limit: 10 });
    expect(() => listToolCallsSchema.parse({ limit: "101" })).toThrow();
  });
});
