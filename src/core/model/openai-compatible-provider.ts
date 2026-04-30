import type {
  ModelMessage,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelTool
} from "./types";
import { parseJsonObject } from "./json";
import { createToolNameMapper } from "./tool-name-mapper";

type OpenAiCompatibleOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: OpenAiToolCall[];
};

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: OpenAiToolCall[];
    };
  }>;
};

export class OpenAiCompatibleProvider implements ModelProvider {
  readonly name = "openai";
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const mapper = createToolNameMapper(request.tools.map((tool) => tool.name));
    const wireTools = mapper.mapTools(request.tools);

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: request.messages.map((message) =>
          toOpenAiMessage(message, mapper.toWireName)
        ),
        tools: wireTools.map(toOpenAiTool),
        tool_choice: "auto"
      })
    });

    const payload = (await response.json().catch(() => undefined)) as
      | OpenAiResponse
      | { error?: { message?: string } }
      | undefined;

    if (!response.ok) {
      const message =
        payload && "error" in payload
          ? payload.error?.message
          : `OpenAI-compatible API error ${response.status}`;
      throw new Error(message ?? `OpenAI-compatible API error ${response.status}`);
    }

    const message = (payload as OpenAiResponse | undefined)?.choices?.[0]?.message;
    const toolCalls = mapper.mapToolCalls(
      (message?.tool_calls ?? []).map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: parseJsonObject(toolCall.function.arguments)
      }))
    );

    return {
      content: message?.content ?? undefined,
      toolCalls,
      raw: payload
    };
  }
}

function toOpenAiMessage(
  message: ModelMessage,
  toWireName: (name: string) => string
): OpenAiMessage {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content
    };
  }

  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content ?? null,
      tool_calls: message.toolCalls?.map((toolCall) => ({
        id: toolCall.id,
        type: "function",
        function: {
          name: toWireName(toolCall.name),
          arguments: JSON.stringify(toolCall.arguments)
        }
      }))
    };
  }

  return {
    role: message.role,
    content: message.content
  };
}

function toOpenAiTool(tool: ModelTool): Record<string, unknown> {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}
