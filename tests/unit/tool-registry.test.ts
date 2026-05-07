import { describe, expect, it } from "vitest";
import { createToolRegistry } from "../../src/tools/registry/tool-registry";
import type { Env } from "../../src/shared/types/env";
import type { RegisteredTool } from "../../src/tools/types";

describe("tool registry", () => {
  it("can compose builtin tools with external tool sources", () => {
    const registry = createToolRegistry({} as Env, {
      externalTools: [externalTool()]
    });

    expect(registry.list().map((tool) => tool.definition.name)).toContain(
      "mcp.weather.get_weather"
    );
    expect(registry.list().map((tool) => tool.source.type)).toContain("mcp");
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
