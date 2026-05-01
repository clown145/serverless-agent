import type {
  ModelProvider,
  ModelRequest,
  ModelResponse
} from "./types";
import {
  buildSystemInstruction,
  extractGeminiText,
  toGeminiContents,
  toGeminiFunction,
  type GeminiResponse
} from "./gemini-format";
import { applyModelAuth, type ModelAuthConfig } from "./provider-auth";
import { createToolNameMapper } from "./tool-name-mapper";

type GeminiOptions = {
  apiKey?: string;
  model: string;
  baseUrl?: string;
  auth?: ModelAuthConfig;
};

export class GeminiProvider implements ModelProvider {
  readonly name = "gemini";
  private readonly baseUrl: string;

  constructor(private readonly options: GeminiOptions) {
    this.baseUrl =
      options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const mapper = createToolNameMapper(request.tools.map((tool) => tool.name));
    const wireTools = mapper.mapTools(request.tools);
    const headers = new Headers({ "content-type": "application/json" });
    const endpoint = applyModelAuth(
      `${this.baseUrl.replace(/\/$/, "")}/models/${this.options.model}:generateContent`,
      headers,
      this.options.auth ?? {
        apiKey: this.options.apiKey,
        authType: "x-goog-api-key"
      }
    );
    const systemInstruction = buildSystemInstruction(request.messages);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        systemInstruction,
        contents: toGeminiContents(request.messages, mapper.toWireName),
        tools: [{ functionDeclarations: wireTools.map(toGeminiFunction) }],
        toolConfig: {
          functionCallingConfig: {
            mode: "AUTO"
          }
        }
      })
    });

    const payload = (await response.json().catch(() => undefined)) as
      | GeminiResponse
      | { error?: { message?: string } }
      | undefined;

    if (!response.ok) {
      const message =
        payload && "error" in payload
          ? payload.error?.message
          : `Gemini API error ${response.status}`;
      throw new Error(message ?? `Gemini API error ${response.status}`);
    }

    const parts = (payload as GeminiResponse | undefined)?.candidates?.[0]?.content
      ?.parts;
    const toolCalls = mapper.mapToolCalls(
      (parts ?? [])
        .filter((part) => part.functionCall)
        .map((part) => ({
          id: part.functionCall?.id ?? crypto.randomUUID(),
          name: part.functionCall?.name ?? "",
          arguments: part.functionCall?.args ?? {}
        }))
    );

    return {
      content: extractGeminiText(parts ?? []),
      toolCalls,
      raw: payload
    };
  }
}
