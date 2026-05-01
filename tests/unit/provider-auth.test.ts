import { describe, expect, it } from "vitest";
import { applyModelAuth } from "../../src/core/model/provider-auth";

describe("provider auth", () => {
  it("adds bearer authorization headers", () => {
    const headers = new Headers();
    const url = applyModelAuth("https://example.test/models", headers, {
      apiKey: "key",
      authType: "bearer"
    });

    expect(url).toBe("https://example.test/models");
    expect(headers.get("authorization")).toBe("Bearer key");
  });

  it("supports query parameter auth", () => {
    const headers = new Headers();
    const url = applyModelAuth("https://example.test/models", headers, {
      apiKey: "key",
      authType: "query-param",
      authQueryParam: "api_key"
    });

    expect(url).toBe("https://example.test/models?api_key=key");
    expect(headers.get("authorization")).toBeNull();
  });
});
