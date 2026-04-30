import type { RegisteredTool } from "../tools/types";
import type { InternalMessage } from "../shared/types/internal-message";
import type { ModelMessage, ModelTool } from "./model/types";

export function createInitialModelMessages(
  message: InternalMessage
): ModelMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are serverless-agent, a Cloudflare serverless agent.",
        "Use tools when a task requires reading or writing the virtual filesystem, sending messages, or performing external actions.",
        "When the task is complete, answer concisely in the user's language.",
        "Do not claim a tool action succeeded unless a tool result confirms it."
      ].join("\n")
    },
    {
      role: "user",
      content: message.text ?? ""
    }
  ];
}

export function createModelTools(tools: RegisteredTool[]): ModelTool[] {
  return tools.map((tool) => ({
    name: tool.definition.name,
    description: tool.definition.description,
    parameters: tool.definition.inputSchema
  }));
}
