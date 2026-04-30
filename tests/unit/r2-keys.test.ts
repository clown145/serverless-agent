import { describe, expect, it } from "vitest";
import { buildVfsObjectKey } from "../../src/storage/r2-keys";

describe("R2 keys", () => {
  it("stores VFS files under one vfs prefix", () => {
    expect(buildVfsObjectKey("default", "/workspace/notes/a.md")).toBe(
      "agents/default/vfs/workspace/notes/a.md"
    );
  });
});
