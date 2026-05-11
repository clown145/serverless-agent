import { describe, expect, it } from "vitest";
import { buildSetupStatus } from "../../src/setup/setup-status";
import type {
  ModelCatalogRecord,
  ModelProviderRecord
} from "../../src/storage/repositories/model-settings-types";

describe("setup status", () => {
  it("reports pending setup when no provider is configured", () => {
    const status = buildSetupStatus({
      providers: [],
      models: []
    });

    expect(status.ready).toBe(false);
    expect(status.steps.map((step) => step.status)).toEqual([
      "pending",
      "pending",
      "pending",
      "pending"
    ]);
  });

  it("reports ready setup when provider, key, models, and default model exist", () => {
    const provider = providerRecord();
    const model = modelRecord(provider.id);
    const status = buildSetupStatus({
      providers: [provider],
      models: [model],
      settings: {
        agentId: "default",
        providerId: provider.id,
        modelId: model.modelId,
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    });

    expect(status.ready).toBe(true);
    expect(status.activeProvider).toBe("Gemini");
    expect(status.activeModel).toBe("Gemini Flash");
  });

  it("includes workspace setup when bootstrap status is provided", () => {
    const status = buildSetupStatus({
      providers: [],
      models: [],
      workspace: {
        initialized: false,
        expected: 2,
        existing: 1,
        missingPaths: ["/workspace"]
      }
    });

    expect(status.steps.at(-1)).toMatchObject({
      id: "workspace",
      status: "pending",
      detail: "1 default directories missing"
    });
  });
});

function providerRecord(): ModelProviderRecord {
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

function modelRecord(providerId: string): ModelCatalogRecord {
  return {
    id: "model-1",
    providerId,
    modelId: "gemini-2.5-flash",
    displayName: "Gemini Flash",
    capabilities: ["tools", "vision", "long_context"],
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}
