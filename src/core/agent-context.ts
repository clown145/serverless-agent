import type { RegisteredTool } from "../tools/types";
import type { InternalMessage } from "../shared/types/internal-message";
import type { SelectedSkill } from "../skills/skill-selector";
import type { ModelMessage, ModelTool } from "./model/types";

export type ConversationContextMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
};

export function createInitialModelMessages(
  message: InternalMessage,
  selectedSkill?: SelectedSkill,
  history: ConversationContextMessage[] = []
): ModelMessage[] {
  return [
    {
      role: "system",
      content: createBaseInstructions()
    },
    ...createSkillMessages(selectedSkill),
    ...createConversationMessages(message, selectedSkill, history)
  ];
}

export function createModelTools(tools: RegisteredTool[]): ModelTool[] {
  return tools.map((tool) => ({
    name: tool.definition.name,
    description: tool.definition.description,
    parameters: tool.definition.inputSchema
  }));
}

function createBaseInstructions(): string {
  return [
    "You are serverless-agent, a Cloudflare serverless agent.",
    "Use tools when a task requires reading or writing the virtual filesystem, sending messages, or performing external actions.",
    "Use search.web to find candidate pages, then use web.fetch_page to read and verify pages when the user asks for details, latest information, or claims that need support.",
    "When the task is complete, answer concisely in the user's language.",
    "Do not claim a tool action succeeded unless a tool result confirms it."
  ].join("\n");
}

function createConversationMessages(
  message: InternalMessage,
  selectedSkill: SelectedSkill | undefined,
  history: ConversationContextMessage[]
): ModelMessage[] {
  const messages = history.flatMap<ModelMessage>((entry) => {
    const content =
      entry.id === message.id && selectedSkill ? selectedSkill.userText : entry.text;

    if (!content) {
      return [];
    }

    return [{ role: entry.role, content }];
  });

  if (history.some((entry) => entry.id === message.id)) {
    return messages;
  }

  return [
    ...messages,
    {
      role: "user",
      content: selectedSkill?.userText ?? message.text ?? ""
    }
  ];
}

function createSkillMessages(selectedSkill?: SelectedSkill): ModelMessage[] {
  if (!selectedSkill) {
    return [];
  }

  return [
    {
      role: "system",
      content: [
        `Active skill: ${selectedSkill.skill.manifest.id}`,
        `Skill name: ${selectedSkill.skill.manifest.name}`,
        `Skill version: ${selectedSkill.skill.manifest.version}`,
        "Skill instructions:",
        selectedSkill.skill.instructions
      ].join("\n")
    }
  ];
}
