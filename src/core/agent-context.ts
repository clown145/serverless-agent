import type { RegisteredTool } from "../tools/types";
import type { InternalMessage } from "../shared/types/internal-message";
import type { SelectedSkill } from "../skills/skill-selector";
import type { ModelMessage, ModelTool } from "./model/types";

export function createInitialModelMessages(
  message: InternalMessage,
  selectedSkill?: SelectedSkill
): ModelMessage[] {
  return [
    {
      role: "system",
      content: createBaseInstructions()
    },
    ...createSkillMessages(selectedSkill),
    {
      role: "user",
      content: selectedSkill?.userText ?? message.text ?? ""
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

function createBaseInstructions(): string {
  return [
    "You are serverless-agent, a Cloudflare serverless agent.",
    "Use tools when a task requires reading or writing the virtual filesystem, sending messages, or performing external actions.",
    "When the task is complete, answer concisely in the user's language.",
    "Do not claim a tool action succeeded unless a tool result confirms it."
  ].join("\n");
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
