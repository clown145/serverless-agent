import { describe, expect, it } from "vitest";
import { parseCommandLine } from "../../src/vfs/commands";

describe("VFS command parser", () => {
  it("splits simple commands", () => {
    expect(parseCommandLine("ls /workspace")).toEqual(["ls", "/workspace"]);
  });

  it("keeps quoted arguments together", () => {
    expect(parseCommandLine('grep "hello world" /notes')).toEqual([
      "grep",
      "hello world",
      "/notes"
    ]);
  });

  it("rejects unclosed quotes", () => {
    expect(() => parseCommandLine('cat "unfinished')).toThrow();
  });
});
