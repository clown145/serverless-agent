import { describe, expect, it } from "vitest";
import { normalizeVfsPath, parentPath } from "../../src/tools/vfs/path";

describe("VFS paths", () => {
  it("normalizes repeated slashes", () => {
    expect(normalizeVfsPath("/workspace//notes/a.md")).toBe(
      "/workspace/notes/a.md"
    );
  });

  it("rejects relative traversal", () => {
    expect(() => normalizeVfsPath("/workspace/../secret")).toThrow();
  });

  it("returns parent paths", () => {
    expect(parentPath("/workspace/notes/a.md")).toBe("/workspace/notes");
    expect(parentPath("/workspace")).toBe("/");
  });
});
