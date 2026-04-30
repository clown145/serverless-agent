import { describe, expect, it } from "vitest";
import {
  createToolNameMapper,
  sanitizeToolName
} from "../../src/core/model/tool-name-mapper";

describe("tool name mapper", () => {
  it("sanitizes internal dotted names", () => {
    expect(sanitizeToolName("vfs.read_file")).toBe("vfs_read_file");
  });

  it("maps provider tool calls back to internal names", () => {
    const mapper = createToolNameMapper(["vfs.read_file"]);

    expect(mapper.toWireName("vfs.read_file")).toBe("vfs_read_file");
    expect(
      mapper.mapToolCalls([
        { id: "call", name: "vfs_read_file", arguments: { path: "/a" } }
      ])
    ).toEqual([{ id: "call", name: "vfs.read_file", arguments: { path: "/a" } }]);
  });
});
