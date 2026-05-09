import { describe, expect, it } from "vitest";
import { DEFAULT_VFS_DIRECTORIES } from "../../src/vfs/bootstrap/default-workspace";

describe("default VFS workspace", () => {
  it("keeps runtime and workspace roots available", () => {
    expect(DEFAULT_VFS_DIRECTORIES).toContain("/workspace");
    expect(DEFAULT_VFS_DIRECTORIES).toContain("/workspace/tasks");
    expect(DEFAULT_VFS_DIRECTORIES).toContain("/user/memory");
    expect(DEFAULT_VFS_DIRECTORIES).toContain("/system/prompts");
    expect(DEFAULT_VFS_DIRECTORIES).toContain("/skills");
  });
});
