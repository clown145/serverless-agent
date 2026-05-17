import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inferModelCapabilities,
  normalizeModelCapabilities
} from "../../src/core/model/capability-defaults";
import { modelCapabilitiesFromMetadata } from "../../src/core/model/model-metadata";
import {
  clearModelsDevMetadataCache,
  fetchModelsDevModelMetadata
} from "../../src/core/model/models-dev-metadata-source";
import type { ModelProviderRecord } from "../../src/storage/repositories/model-settings-types";
import { mapModelCatalogRow } from "../../src/storage/repositories/model-settings-types";

describe("model capabilities", () => {
  afterEach(() => {
    clearModelsDevMetadataCache();
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
    expect(normalizeModelCapabilities("[\"vision\",\"reasoning\",\"bad\"]", "text")).toEqual([
      "vision",
      "reasoning"
    ]);
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
        capabilities_source: "models.dev",
        context_window: 1047576,
        max_output_tokens: 32768,
        metadata_json: "{\"id\":\"openai/gpt-4.1\"}",
        metadata_source: "models.dev",
        metadata_confidence: "exact",
        metadata_fetched_at: "2026-01-01T00:00:00.000Z",
        status: "available",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      capabilities: ["tools", "structured_output"],
      capabilitiesSource: "models.dev",
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      metadata: { id: "openai/gpt-4.1" },
      metadataSource: "models.dev",
      metadataConfidence: "exact"
    });
  });

  it("derives capabilities from metadata instead of model-name guessing", () => {
    expect(
      modelCapabilitiesFromMetadata({
        modelId: "unknown-text-model",
        inputModalities: ["text", "image"],
        supportedParameters: ["tools", "structured_outputs"],
        supportsReasoning: true,
        contextWindow: 1000000
      })
    ).toEqual(["tools", "vision", "long_context", "structured_output", "reasoning"]);
  });

  it("requires at least one million context tokens for long-context metadata", () => {
    expect(
      modelCapabilitiesFromMetadata({
        modelId: "unknown-text-model",
        supportedParameters: ["tools"],
        contextWindow: 999999
      })
    ).toEqual(["tools"]);
  });

  it("matches Gemini models exactly inside the google models.dev provider", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          google: {
            id: "google",
            name: "Google",
            models: {
              "gemini-2.5-flash": {
                id: "gemini-2.5-flash",
                name: "Gemini 2.5 Flash",
                tool_call: true,
                reasoning: true,
                structured_output: true,
                modalities: {
                  input: ["text", "image"],
                  output: ["text"]
                },
                limit: {
                  context: 1048576,
                  output: 65536
                }
              },
              "gemini-2.5-flash-preview": {
                id: "gemini-2.5-flash-preview",
                modalities: {
                  input: ["text"],
                  output: ["text"]
                },
                limit: {
                  context: 1000000,
                  output: 8192
                }
              }
            }
          }
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const metadata = await fetchModelsDevModelMetadata(
      geminiProviderRecord(),
      ["gemini-2.5-flash"]
    );

    expect(metadata.get("gemini-2.5-flash")).toMatchObject({
      source: "models.dev",
      confidence: "exact",
      matchedModelId: "google/gemini-2.5-flash",
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      capabilities: ["tools", "vision", "long_context", "structured_output", "reasoning"]
    });
  });

  it("uses the first models.dev provider when a model id appears multiple times", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            openai: {
              id: "openai",
              name: "OpenAI",
              models: {
                "gpt-4.1-mini": {
                  id: "gpt-4.1-mini",
                  tool_call: false,
                  modalities: {
                    input: ["text"],
                    output: ["text"]
                  },
                  limit: {
                    context: 128000,
                    output: 4096
                  }
                }
              }
            },
            "custom-host": {
              id: "custom-host",
              name: "Custom Host",
              api: "https://example.com/v1",
              models: {
                "gpt-4.1-mini": {
                  id: "gpt-4.1-mini",
                  tool_call: true,
                  structured_output: true,
                  modalities: {
                    input: ["text", "image", "file"],
                    output: ["text"]
                  },
                  limit: {
                    context: 1047576,
                    output: 32768
                  }
                }
              }
            }
          }),
          { status: 200 }
        );
      })
    );

    const metadata = await fetchModelsDevModelMetadata(
      customProviderRecord(),
      ["gpt-4.1-mini"]
    );

    expect(metadata.get("gpt-4.1-mini")).toMatchObject({
      source: "models.dev",
      confidence: "exact",
      matchedModelId: "openai/gpt-4.1-mini",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      capabilities: []
    });
  });

  it("falls back to global exact model id matching when provider is unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            openai: {
              id: "openai",
              name: "OpenAI",
              models: {
                "gpt-4.1-mini": {
                  id: "gpt-4.1-mini",
                  tool_call: true,
                  modalities: {
                    input: ["text", "image"],
                    output: ["text"]
                  },
                  limit: {
                    context: 1047576,
                    output: 32768
                  }
                }
              }
            }
          }),
          { status: 200 }
        );
      })
    );

    const metadata = await fetchModelsDevModelMetadata(
      { ...customProviderRecord(), baseUrl: "https://not-listed.example/v1" },
      ["gpt-4.1-mini"]
    );

    expect(metadata.get("gpt-4.1-mini")).toMatchObject({
      source: "models.dev",
      confidence: "exact",
      matchedModelId: "openai/gpt-4.1-mini",
      contextWindow: 1047576,
      maxOutputTokens: 32768,
      capabilities: ["tools", "vision", "long_context"]
    });
  });

  it("does not guess models.dev entries by provider or model id prefix", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            openrouter: {
              id: "openrouter",
              name: "OpenRouter",
              models: {
                "openai/gpt-4.1-mini": {
                  id: "openai/gpt-4.1-mini",
                  tool_call: true,
                  modalities: {
                    input: ["text", "image"],
                    output: ["text"]
                  },
                  limit: {
                    context: 1047576,
                    output: 32768
                  }
                }
              }
            }
          }),
          { status: 200 }
        );
      })
    );

    const metadata = await fetchModelsDevModelMetadata(
      customProviderRecord(),
      ["gpt-4.1-mini"]
    );

    expect(metadata.size).toBe(0);
  });

  it("indexes exact model object ids when they differ from the models.dev map key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            provider: {
              id: "provider",
              name: "Provider",
              models: {
                "catalog-key": {
                  id: "canonical-model-id",
                  tool_call: true,
                  modalities: {
                    input: ["text"],
                    output: ["text"]
                  },
                  limit: {
                    context: 32000,
                    output: 2048
                  }
                }
              }
            }
          }),
          { status: 200 }
        );
      })
    );

    const metadata = await fetchModelsDevModelMetadata(
      customProviderRecord(),
      ["canonical-model-id"]
    );

    expect(metadata.get("canonical-model-id")).toMatchObject({
      source: "models.dev",
      confidence: "exact",
      matchedModelId: "provider/catalog-key",
      contextWindow: 32000,
      maxOutputTokens: 2048,
      capabilities: ["tools"]
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

function customProviderRecord(): ModelProviderRecord {
  return {
    id: "provider-2",
    name: "Custom",
    providerType: "custom",
    baseUrl: "https://example.com/v1",
    credentialId: "credential-1",
    authType: "bearer",
    modelListStrategy: "openai",
    chatProtocol: "openai-chat-completions",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}
