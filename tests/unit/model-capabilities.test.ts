import { describe, expect, it } from "vitest";
import {
  inferModelCapabilities,
  normalizeModelCapabilities
} from "../../src/core/model/capability-defaults";
import { mapModelCatalogRow } from "../../src/storage/repositories/model-settings-types";

describe("model capabilities", () => {
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
      capabilities: ["tools", "vision", "long_context"]
    });
  });
});
