import { describe, expect, it } from "vitest";
import { buildVfsBlobKey, buildVfsObjectKey } from "../../src/storage/r2-keys";

describe("R2 keys", () => {
  it("stores VFS files under one vfs prefix", () => {
    expect(buildVfsObjectKey("default", "/workspace/notes/a.md")).toBe(
      "agents/default/vfs/workspace/notes/a.md"
    );
  });

  it("stores content-addressed VFS blobs in sharded prefixes", () => {
    expect(buildVfsBlobKey("default", "abcdef")).toBe(
      "agents/default/vfs/blobs/sha256/ab/cd/abcdef"
    );
  });
});
