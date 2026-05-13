import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inferModelCapabilities,
  normalizeModelCapabilities
} from "../../src/core/model/capability-defaults";
import { modelCapabilitiesFromMetadata } from "../../src/core/model/model-metadata";
import { fetchOpenRouterModelMetadata } from "../../src/core/model/openrouter-metadata-source";
import type { ModelProviderRecord } from "../../src/storage/repositories/model-settings-types";
import { mapModelCatalogRow } from "../../src/storage/repositories/model-settings-types";

describe("model capabilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("infers common vision and long-context models", () => {
    expect(inferModelCapabilities("gemini-2.5-flash")).toEqual([
      "tools",
      "vision",
      "long_context"
    ]);
    expect(inferModelCapabilities("text-only-small")).toEqual(["tools"]);
  });

  it("normalizes stored capabilities", () => {
    expect(normalizeModelCapabilities("[\"vision\",\"bad\"]", "text")).toEqual(["vision"]);
  });

  it("maps catalog rows with inferred capability fallback", () => {
    expect(
      mapModelCatalogRow({
        id: "model-1",
        provider_id: "provider-1",
        model_id: "gpt-4.1",
        display_name: "GPT",
        capabilities_json: null,
        status: "available",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      capabilities: ["tools", "vision", "long_context"],
      capabilitiesSource: "inferred",
      contextWindow: undefined
    });
  });

  it("maps cached metadata fields", () => {
    expect(
      mapModelCatalogRow({
        id: "model-1",
        provider_id: "provider-1",
        model_id: "openai/gpt-4.1",
        display_name: "GPT",
        capabilities_json: "[\"tools\",\"structured_output\"]",
        capabilities_source: "openrouter",
        context_window: 1047576,
        max_output_tokens: 32768,
        metadata_json: "{\"id\":\"openai/gpt-4.1\"}",
        metadata_source: "openrouter",
        metadata_confidence: "exact",
        metadata_fetched_at: "2026-01-01T00:00:00.000Z",
        status: "available",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      capabilities: ["tools", "structured_output"],
      capabilitiesSource: "openrouter",
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      metadata: { id: "openai/gpt-4.1" },
      metadataSource: "openrouter",
      metadataConfidence: "exact"
    });
  });

  it("derives capabilities from metadata instead of model-name guessing", () => {
    expect(
      modelCapabilitiesFromMetadata({
        modelId: "unknown-text-model",
        inputModalities: ["text", "image"],
        supportedParameters: ["tools", "structured_outputs"],
        contextWindow: 200000
      })
    ).toEqual(["tools", "vision", "long_context", "structured_output"]);
  });

  it("matches direct Gemini models to OpenRouter metadata aliases", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "google/gemini-2.5-flash",
              name: "Gemini 2.5 Flash",
              context_length: 1048576,
              architecture: {
                input_modalities: ["text", "image"],
                output_modalities: ["text"]
              },
              top_provider: {
                max_completion_tokens: 65536
              },
              supported_parameters: ["tools", "structured_outputs"]
            }
          ]
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const metadata = await fetchOpenRouterModelMetadata(
      geminiProviderRecord(),
      ["gemini-2.5-flash"]
    );

    expect(metadata.get("gemini-2.5-flash")).toMatchObject({
      source: "openrouter",
      confidence: "alias",
      matchedModelId: "google/gemini-2.5-flash",
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      capabilities: ["tools", "vision", "long_context", "structured_output"]
    });
  });
});

function geminiProviderRecord(): ModelProviderRecord {
  return {
    id: "provider-1",
    name: "Gemini",
    providerType: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    credentialId: "credential-1",
    authType: "query-param",
    authQueryParam: "key",
    modelListStrategy: "gemini",
    chatProtocol: "gemini-generate-content",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}
