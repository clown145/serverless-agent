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

export type ModelMessage =
  | {
      role: "system";
      content: string;
    }
  | {
      role: "user";
      content: string;
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
