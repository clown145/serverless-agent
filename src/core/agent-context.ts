import type { RegisteredTool } from "../tools/types";
import type { InternalMessage } from "../shared/types/internal-message";
import type { SelectedSkill } from "../skills/skill-selector";
import type { SkillCatalogItem } from "../skills/skill-loader";
import { promptText } from "../prompts";
import type { ModelContentPart, ModelMessage, ModelTool } from "./model/types";

export type ConversationContextMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  attachments?: ModelContentPart[];
};

export type AgentContextOptions = {
  timeZone?: string;
  platformFormatInstruction?: string;
  conversationSummary?: string;
  skillCatalog?: SkillCatalogItem[];
};

export function createInitialModelMessages(
  message: InternalMessage,
  selectedSkill?: SelectedSkill,
  history: ConversationContextMessage[] = [],
  options: AgentContextOptions = {}
): ModelMessage[] {
  return [
    {
      role: "system",
      content: createBaseInstructions(message, options)
    },
    ...createSummaryMessages(options.conversationSummary),
    ...createSkillCatalogMessages(options.skillCatalog),
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

function createBaseInstructions(message: InternalMessage, options: AgentContextOptions): string {
  return promptText("agent/base", {
    runtime_context: createRuntimeContext(message, options.timeZone),
    platform_format_instruction:
      options.platformFormatInstruction ?? defaultPlatformFormatInstruction(message.platform)
  });
}

function createRuntimeContext(message: InternalMessage, timeZone = "UTC"): string {
  const now = new Date();
  return [
    `Current time: ${formatLocalTime(now, timeZone)}`,
    `Current time ISO: ${now.toISOString()}`,
    `Configured timezone: ${normalizeTimeZone(timeZone)}`,
    `Current platform: ${message.platform}`,
    `Current conversation: ${message.conversationId}`
  ].join("\n");
}

function formatLocalTime(date: Date, timeZone: string): string {
  const normalized = normalizeTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: normalized
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "UTC"
    }).format(date);
  }
}

function normalizeTimeZone(timeZone?: string): string {
  return timeZone?.trim() || "UTC";
}

function defaultPlatformFormatInstruction(platform: InternalMessage["platform"]): string {
  if (platform === "webui" || platform === "admin") {
    return promptText("platforms/webui");
  }

  return promptText("platforms/default");
}

function createConversationMessages(
  message: InternalMessage,
  selectedSkill: SelectedSkill | undefined,
  history: ConversationContextMessage[]
): ModelMessage[] {
  const messages = history.flatMap<ModelMessage>((entry) => {
    const content = entry.id === message.id && selectedSkill ? selectedSkill.userText : entry.text;

    if (content === undefined && !entry.attachments?.length) {
      return [];
    }

    if (entry.role === "assistant") {
      return [{ role: "assistant", content: content ?? "" }];
    }

    return [
      {
        role: "user",
        content: contentWithAttachments(content ?? "", entry.attachments)
      }
    ];
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
        `Active skill: ${selectedSkill.skill.metadata.id}`,
        `Skill name: ${selectedSkill.skill.metadata.name}`,
        `Skill version: ${selectedSkill.skill.metadata.version}`,
        "Skill instructions:",
        selectedSkill.skill.instructions
      ].join("\n")
    }
  ];
}

function createSkillCatalogMessages(skillCatalog: SkillCatalogItem[] | undefined): ModelMessage[] {
  const items = (skillCatalog ?? []).slice(0, 40);
  if (!items.length) {
    return [];
  }

  return [
    {
      role: "system",
      content: [
        "Available skills. Use `/skill <id> <task>` when one of these skills is relevant; the full SKILL.md is loaded only after the skill is active.",
        ...items.map((skill) => `- ${skill.id}: ${skill.description}`)
      ].join("\n")
    }
  ];
}

function createSummaryMessages(summary: string | undefined): ModelMessage[] {
  if (!summary?.trim()) {
    return [];
  }

  return [
    {
      role: "system",
      content: ["Conversation summary from earlier messages:", summary.trim()].join("\n")
    }
  ];
}

function contentWithAttachments(
  text: string,
  attachments: ModelContentPart[] | undefined
): string | ModelContentPart[] {
  if (!attachments?.length) {
    return text;
  }

  return [{ type: "text", text }, ...attachments];
}
