import { describe, expect, it, vi } from "vitest";
import { createMcpRegisteredTool } from "../../src/tools/mcp/adapter";

describe("MCP tool adapter", () => {
  it("wraps MCP tools with a namespaced registry definition", async () => {
    const callTool = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "sunny" }],
      structuredContent: { weather: "sunny" }
    }));
    const tool = createMcpRegisteredTool({
      serverId: "weather-prod",
      serverName: "Weather",
      tool: {
        name: "get_weather",
        description: "Get weather",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string" }
          },
          required: ["location"]
        },
        annotations: {
          readOnlyHint: true
        }
      },
      callTool
    });

    const result = await tool.execute({
      env: {} as Parameters<typeof tool.execute>[0]["env"],
      agentId: "agent",
      actorId: "user",
      runId: "run",
      stepId: "step",
      input: { location: "Tokyo" }
    });

    expect(tool.definition.name).toBe("mcp.weather-prod.get_weather");
    expect(tool.source.type).toBe("mcp");
    expect(tool.definition.sideEffect).toBe("none");
    expect(callTool).toHaveBeenCalledWith({
      name: "get_weather",
      arguments: { location: "Tokyo" }
    });
    expect(result).toMatchObject({
      status: "success",
      output: { weather: "sunny" }
    });
  });

  it("maps MCP execution errors into tool results", async () => {
    const tool = createMcpRegisteredTool({
      serverId: "server",
      serverName: "Server",
      tool: {
        name: "fail",
        inputSchema: { type: "object" }
      },
      callTool: async () => ({
        content: [{ type: "text", text: "bad input" }],
        isError: true
      })
    });

    await expect(
      tool.execute({
        env: {} as Parameters<typeof tool.execute>[0]["env"],
        agentId: "agent",
        actorId: "user",
        runId: "run",
        stepId: "step",
        input: {}
      })
    ).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "mcp_tool_error",
        message: "bad input"
      }
    });
  });
});
