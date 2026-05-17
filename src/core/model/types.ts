import type { MessageAttachment } from "../../shared/types/internal-message";

export type JsonSchema = Record<string, unknown>;

export type ModelProviderName = "openai" | "gemini" | "mock";

export type ModelTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
};

export type ModelToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ModelContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      mimeType: string;
      dataBase64: string;
      sourceAttachment?: MessageAttachment;
    };

export type ModelContent = string | ModelContentPart[];

export type ModelMessage =
  | {
      role: "system";
      content: string;
    }
  | {
      role: "user";
      content: ModelContent;
    }
  | {
      role: "assistant";
      content?: string;
      toolCalls?: ModelToolCall[];
    }
  | {
      role: "tool";
      toolCallId: string;
      toolName: string;
      content: string;
    };

export type ModelRequest = {
  messages: ModelMessage[];
  tools: ModelTool[];
};

export type ModelResponse = {
  content?: string;
  toolCalls: ModelToolCall[];
  raw?: unknown;
};

export interface ModelProvider {
  name: ModelProviderName;
  complete(request: ModelRequest): Promise<ModelResponse>;
}
