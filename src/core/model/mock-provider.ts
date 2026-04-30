import { createId } from "../../shared/ids";
import type { ModelProvider, ModelRequest, ModelResponse } from "./types";

export class MockModelProvider implements ModelProvider {
  readonly name = "mock";

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const latestTool = [...request.messages].reverse().find((message) => {
      return message.role === "tool";
    });

    if (latestTool?.role === "tool") {
      return { content: "工具调用已完成。", toolCalls: [] };
    }

    const latestUser = [...request.messages].reverse().find((message) => {
      return message.role === "user";
    });

    const content = latestUser?.role === "user" ? latestUser.content : "";
    const writeMatch = content.match(/^\/write\s+(\S+)\s+([\s\S]+)$/);
    if (writeMatch) {
      if (!hasTool(request, "vfs.write_file")) {
        return { content: "工具不可用：vfs.write_file", toolCalls: [] };
      }

      return {
        toolCalls: [
          {
            id: createId("call"),
            name: "vfs.write_file",
            arguments: {
              path: writeMatch[1],
              content: writeMatch[2]
            }
          }
        ]
      };
    }

    const readMatch = content.match(/^\/read\s+(\S+)$/);
    if (readMatch) {
      if (!hasTool(request, "vfs.read_file")) {
        return { content: "工具不可用：vfs.read_file", toolCalls: [] };
      }

      return {
        toolCalls: [
          {
            id: createId("call"),
            name: "vfs.read_file",
            arguments: {
              path: readMatch[1]
            }
          }
        ]
      };
    }

    if (content.trim() === "/ping") {
      return { content: "pong", toolCalls: [] };
    }

    return { content: `收到：${content}`, toolCalls: [] };
  }
}

function hasTool(request: ModelRequest, toolName: string): boolean {
  return request.tools.some((tool) => tool.name === toolName);
}
