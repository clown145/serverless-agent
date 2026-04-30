import { describe, expect, it } from "vitest";
import { MockModelProvider } from "../../src/core/model/mock-provider";

describe("mock provider", () => {
  it("supports deterministic ping", async () => {
    const provider = new MockModelProvider();
    const response = await provider.complete({
      messages: [{ role: "user", content: "/ping" }],
      tools: []
    });

    expect(response.content).toBe("pong");
    expect(response.toolCalls).toEqual([]);
  });

  it("can request VFS writes", async () => {
    const provider = new MockModelProvider();
    const response = await provider.complete({
      messages: [{ role: "user", content: "/write /workspace/a.md hello" }],
      tools: []
    });

    expect(response.toolCalls[0]?.name).toBe("vfs.write_file");
    expect(response.toolCalls[0]?.arguments).toMatchObject({
      path: "/workspace/a.md",
      content: "hello"
    });
  });
});
