import type { ModelContent, ModelMessage, ModelTool } from "./types";

export type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    id?: string;
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
};

export type GeminiContent = {
  role?: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiResponse = {
  candidates?: Array<{
    content?: GeminiContent;
  }>;
};

export function buildSystemInstruction(messages: ModelMessage[]): GeminiContent | undefined {
  const text = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  return text ? { parts: [{ text }] } : undefined;
}

export function toGeminiContents(
  messages: ModelMessage[],
  toWireName: (name: string) => string
): GeminiContent[] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => toGeminiContent(message, toWireName));
}

export function toGeminiFunction(tool: ModelTool): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  };
}

export function extractGeminiText(parts: GeminiPart[]): string | undefined {
  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n");

  return text || undefined;
}

function toGeminiContent(
  message: ModelMessage,
  toWireName: (name: string) => string
): GeminiContent {
  if (message.role === "system") {
    return { role: "user", parts: [{ text: message.content }] };
  }

  if (message.role === "user") {
    return { role: "user", parts: toGeminiParts(message.content) };
  }

  if (message.role === "tool") {
    return {
      role: "user",
      parts: [
        {
          functionResponse: {
            id: message.toolCallId,
            name: toWireName(message.toolName),
            response: parseToolContent(message.content)
          }
        }
      ]
    };
  }

  if (message.toolCalls?.length) {
    return {
      role: "model",
      parts: message.toolCalls.map((toolCall) => ({
        functionCall: {
          id: toolCall.id,
          name: toWireName(toolCall.name),
          args: toolCall.arguments
        }
      }))
    };
  }

  return {
    role: "model",
    parts: [{ text: message.content ?? "" }]
  };
}

function toGeminiParts(content: ModelContent): GeminiPart[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }

  return content.map((part) => {
    if (part.type === "text") {
      return { text: part.text };
    }

    return {
      inlineData: {
        mimeType: part.mimeType,
        data: part.dataBase64
      }
    };
  });
}

function parseToolContent(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { result: parsed };
  } catch {
    return { result: content };
  }
}
