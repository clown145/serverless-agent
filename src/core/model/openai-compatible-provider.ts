import type { ModelMessage, ModelProvider, ModelRequest, ModelResponse, ModelTool } from "./types";
import { parseJsonObject } from "./json";
import { openAiChatUrl } from "./provider-endpoints";
import { applyModelAuth, type ModelAuthConfig } from "./provider-auth";
import { createToolNameMapper } from "./tool-name-mapper";
import {
  openAiReasoningBodyFields,
  openAiReasoningContent,
  openAiReasoningFromResponse
} from "./openai-reasoning";

type OpenAiCompatibleOptions = {
  apiKey?: string;
  model: string;
  baseUrl?: string;
  auth?: ModelAuthConfig;
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | OpenAiContentPart[] | null;
  reasoning_content?: string;
  tool_call_id?: string;
  tool_calls?: OpenAiToolCall[];
};

type OpenAiContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
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
      reasoning_content?: string | null;
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

    const headers = new Headers({ "content-type": "application/json" });
    const endpoint = applyModelAuth(
      openAiChatUrl(this.baseUrl),
      headers,
      this.options.auth ?? {
        apiKey: this.options.apiKey,
        authType: "bearer"
      }
    );
    const payload = await postChatCompletion(
      endpoint,
      headers,
      createOpenAiBody(
        this.options.model,
        this.baseUrl,
        request,
        wireTools,
        mapper.toWireName,
        "native"
      )
    ).catch(async (error) => {
      if (!shouldRetryToolResultsAsText(error, request.messages)) {
        throw error;
      }

      return postChatCompletion(
        endpoint,
        headers,
        createOpenAiBody(
          this.options.model,
          this.baseUrl,
          request,
          wireTools,
          mapper.toWireName,
          "text"
        )
      );
    });

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
      reasoning: openAiReasoningFromResponse(message),
      raw: payload
    };
  }
}

type ToolResultMode = "native" | "text";

function createOpenAiBody(
  model: string,
  baseUrl: string | undefined,
  request: ModelRequest,
  wireTools: ModelTool[],
  toWireName: (name: string) => string,
  toolResultMode: ToolResultMode
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: toOpenAiMessages(request.messages, toWireName, toolResultMode, {
      model,
      baseUrl,
      settings: request.reasoning
    }),
    ...openAiReasoningBodyFields({
      model,
      baseUrl,
      settings: request.reasoning
    })
  };

  if (wireTools.length) {
    body.tools = wireTools.map(toOpenAiTool);
    body.tool_choice = "auto";
  }

  return body;
}

function toOpenAiMessages(
  messages: ModelMessage[],
  toWireName: (name: string) => string,
  toolResultMode: ToolResultMode,
  reasoning: { model: string; baseUrl?: string; settings?: ModelRequest["reasoning"] }
): OpenAiMessage[] {
  return messages.map((message) => toOpenAiMessage(message, toWireName, toolResultMode, reasoning));
}

function toOpenAiMessage(
  message: ModelMessage,
  toWireName: (name: string) => string,
  toolResultMode: ToolResultMode,
  reasoning: { model: string; baseUrl?: string; settings?: ModelRequest["reasoning"] }
): OpenAiMessage {
  if (message.role === "tool") {
    if (toolResultMode === "text") {
      return {
        role: "user",
        content: [
          `Tool result for ${toWireName(message.toolName)} (${message.toolCallId}):`,
          message.content
        ].join("\n")
      };
    }

    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content
    };
  }

  if (message.role === "assistant") {
    if (toolResultMode === "text" && message.toolCalls?.length) {
      return {
        role: "assistant",
        content: [
          message.content,
          "Requested tools:",
          ...message.toolCalls.map(
            (toolCall) => `${toWireName(toolCall.name)} ${JSON.stringify(toolCall.arguments)}`
          )
        ]
          .filter(Boolean)
          .join("\n")
      };
    }

    const reasoningContent = openAiReasoningContent(message, reasoning);
    return {
      role: "assistant",
      content: message.content ?? null,
      ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
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
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === "text"
            ? { type: "text", text: part.text }
            : {
                type: "image_url",
                image_url: {
                  url: `data:${part.mimeType};base64,${part.dataBase64}`
                }
              }
        )
      : message.content
  };
}

async function postChatCompletion(
  endpoint: string,
  headers: Headers,
  body: Record<string, unknown>
): Promise<OpenAiResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: new Headers(headers),
    body: JSON.stringify(body)
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

  return payload as OpenAiResponse;
}

function shouldRetryToolResultsAsText(error: unknown, messages: ModelMessage[]): boolean {
  if (!messages.some((message) => message.role === "tool")) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /tool|function|param|parameter|incorrect|invalid/i.test(message);
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
