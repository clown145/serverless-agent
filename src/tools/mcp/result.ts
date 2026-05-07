import type { ToolResult } from "../types";
import type { McpCallToolResult, McpContentBlock } from "./types";

export function mapMcpToolResult(result: McpCallToolResult): ToolResult {
  const output = result.structuredContent ?? { content: result.content };

  if (result.isError) {
    return {
      status: "failed",
      output,
      error: {
        code: "mcp_tool_error",
        message: mcpContentText(result.content) || "MCP tool execution failed",
        retryable: true
      }
    };
  }

  return {
    status: "success",
    output
  };
}

export function mcpContentText(content: McpContentBlock[]): string {
  return content
    .filter((item): item is Extract<McpContentBlock, { type: "text" }> => {
      return item.type === "text";
    })
    .map((item) => item.text)
    .join("\n")
    .trim();
}
