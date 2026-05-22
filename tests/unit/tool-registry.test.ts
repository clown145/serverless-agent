import { describe, expect, it } from "vitest";
import { createToolRegistry } from "../../src/tools/registry/tool-registry";
import type { Env } from "../../src/shared/types/env";
import type { RegisteredTool } from "../../src/tools/types";
import { filterToolsForPlatform } from "../../src/tools/platform-availability";

describe("tool registry", () => {
  it("can compose builtin tools with external tool sources", () => {
    const registry = createToolRegistry({} as Env, {
      externalTools: [externalTool()]
    });

    expect(registry.list().map((tool) => tool.definition.name)).toContain(
      "mcp.weather.get_weather"
    );
    expect(registry.list().map((tool) => tool.source.type)).toContain("mcp");
    expect(registry.get("mcp.weather.get_weather")?.source.type).toBe("mcp");
  });

  it("filters platform-specific tools by conversation platform", () => {
    const registry = createToolRegistry({} as Env);
    const names = filterToolsForPlatform(registry.list(), "weixin_oc").map(
      (tool) => tool.definition.name
    );

    expect(names).toContain("weixin_oc.send_image");
    expect(names).not.toContain("telegram.send_image");
  });

  it("rejects platform-specific tools from other platforms before execution", async () => {
    const registry = createToolRegistry({} as Env, {
      externalTools: [platformTool()]
    });

    const result = await registry.execute("demo.only_weixin", {
      agentId: "default",
      actorId: "user",
      platform: "telegram",
      conversationId: "telegram:1",
      runId: "run_1",
      stepId: "step_1",
      input: {}
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "platform_tool_unavailable"
      }
    });
  });
});

function externalTool(): RegisteredTool {
  return {
    source: {
      type: "mcp",
      id: "weather",
      name: "Weather"
    },
    definition: {
      name: "mcp.weather.get_weather",
      description: "Get weather",
      inputSchema: { type: "object" },
      permission: { level: 1, scopes: ["weather:read"] },
      sideEffect: "none",
      timeoutMs: 1000
    },
    execute: async () => ({ status: "success" })
  };
}

function platformTool(): RegisteredTool {
  return {
    source: {
      type: "mcp",
      id: "demo",
      name: "Demo"
    },
    definition: {
      name: "demo.only_weixin",
      description: "Only Weixin",
      inputSchema: { type: "object" },
      platforms: ["weixin_oc"],
      permission: { level: 1, scopes: [] },
      sideEffect: "none",
      timeoutMs: 1000
    },
    execute: async () => ({ status: "success" })
  };
}
