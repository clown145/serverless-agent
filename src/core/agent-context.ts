import type { RegisteredTool } from "../tools/types";
import type { InternalMessage } from "../shared/types/internal-message";
import type { SelectedSkill } from "../skills/skill-selector";
import type { SkillCatalogItem } from "../skills/skill-loader";
import type { ModelContentPart, ModelMessage, ModelTool } from "./model/types";
import type { TelegramParseMode } from "../adapters/telegram/formatting";

export type ConversationContextMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  attachments?: ModelContentPart[];
};

export type AgentContextOptions = {
  timeZone?: string;
  telegramParseMode?: TelegramParseMode;
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

function createBaseInstructions(
  message: InternalMessage,
  options: AgentContextOptions
): string {
  return [
    "You are serverless-agent, a Cloudflare serverless agent.",
    createRuntimeContext(message, options.timeZone),
    "Use tools when a task requires reading or writing the virtual filesystem, sending messages, or performing external actions.",
    "Use search.web to find candidate pages, then use web.fetch_page to read and verify pages when the user asks for details, latest information, or claims that need support.",
    "Do not force a search result count unless the user explicitly requests one; the system search settings control the normal result count.",
    platformFormatInstruction(message.platform, options),
    "When the task is complete, answer concisely in the user's language.",
    "Do not claim a tool action succeeded unless a tool result confirms it."
  ].join("\n");
}

function createRuntimeContext(
  message: InternalMessage,
  timeZone = "UTC"
): string {
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

function platformFormatInstruction(
  platform: InternalMessage["platform"],
  options: AgentContextOptions
): string {
  if (platform === "telegram") {
    if (options.telegramParseMode === "none") {
      return [
        "Telegram formatting: messages are sent as plain text.",
        "Avoid Markdown tables, HTML tags, and formatting that requires Telegram parse mode.",
        "Use short sections, numbered lines, plain URLs, and compact text."
      ].join("\n");
    }

    if (options.telegramParseMode === "MarkdownV2") {
      return [
        "Telegram formatting: messages are sent with Telegram parse_mode MarkdownV2.",
        "MarkdownV2 requires escaping reserved characters: _ * [ ] ( ) ~ ` > # + - = | { } . !",
        "Prefer simple bold/italic/code only when you can escape correctly; avoid tables and complex formatting."
      ].join("\n");
    }

    return [
      "Telegram formatting: messages are sent with Telegram parse_mode HTML by default.",
      "Use only Telegram-supported HTML tags when useful: <b>, <i>, <u>, <s>, <code>, <pre>, <a href=\"https://...\">text</a>.",
      "Escape literal <, >, and & when they are not part of supported tags.",
      "Avoid Markdown tables and MarkdownV2-specific syntax; use short sections, numbered lines, plain URLs, and compact text."
    ].join("\n");
  }

  if (platform === "webui" || platform === "admin") {
    return "WebUI formatting: concise Markdown-style text is acceptable, but avoid very wide tables.";
  }

  return "Platform formatting: keep output plain, compact, and compatible with chat clients.";
}

function createConversationMessages(
  message: InternalMessage,
  selectedSkill: SelectedSkill | undefined,
  history: ConversationContextMessage[]
): ModelMessage[] {
  const messages = history.flatMap<ModelMessage>((entry) => {
    const content =
      entry.id === message.id && selectedSkill ? selectedSkill.userText : entry.text;

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

function createSkillCatalogMessages(
  skillCatalog: SkillCatalogItem[] | undefined
): ModelMessage[] {
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
      content: [
        "Conversation summary from earlier messages:",
        summary.trim()
      ].join("\n")
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

  return [
    { type: "text", text },
    ...attachments
  ];
}
