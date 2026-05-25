import type { ModelProvider, ModelRequest, ModelResponse } from "./types";
import {
  buildSystemInstruction,
  extractGeminiText,
  toGeminiContents,
  toGeminiFunction,
  type GeminiResponse
} from "./gemini-format";
import { geminiGenerationConfig, geminiReasoningFromParts } from "./gemini-reasoning";
import { applyModelAuth, type ModelAuthConfig } from "./provider-auth";
import { geminiGenerateUrl } from "./provider-endpoints";
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
    this.baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const mapper = createToolNameMapper(request.tools.map((tool) => tool.name));
    const wireTools = mapper.mapTools(request.tools);
    const headers = new Headers({ "content-type": "application/json" });
    const endpoint = applyModelAuth(
      geminiGenerateUrl(this.baseUrl, this.options.model),
      headers,
      this.options.auth ?? {
        apiKey: this.options.apiKey,
        authType: "query-param",
        authQueryParam: "key"
      }
    );
    const systemInstruction = buildSystemInstruction(request.messages);
    const body: Record<string, unknown> = {
      systemInstruction,
      contents: toGeminiContents(request.messages, mapper.toWireName, {
        model: this.options.model,
        baseUrl: this.baseUrl,
        settings: request.reasoning
      })
    };
    const generationConfig = geminiGenerationConfig({
      model: this.options.model,
      baseUrl: this.baseUrl,
      settings: request.reasoning
    });

    if (generationConfig) {
      body.generationConfig = generationConfig;
    }

    if (wireTools.length) {
      body.tools = [{ functionDeclarations: wireTools.map(toGeminiFunction) }];
      body.toolConfig = {
        functionCallingConfig: {
          mode: "AUTO"
        }
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
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

    const parts = (payload as GeminiResponse | undefined)?.candidates?.[0]?.content?.parts;
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
      reasoning: geminiReasoningFromParts(parts ?? [], toolCalls),
      raw: payload
    };
  }
}
