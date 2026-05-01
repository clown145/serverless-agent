import { describe, expect, it } from "vitest";
import { isSecretBindingName } from "../../src/core/model/secret-binding";

describe("secret binding names", () => {
  it("accepts uppercase Cloudflare binding names", () => {
    expect(isSecretBindingName("GEMINI_API_KEY")).toBe(true);
    expect(isSecretBindingName("_MODEL_KEY_2")).toBe(true);
  });

  it("rejects values that look like user input or API key values", () => {
    expect(isSecretBindingName("20070101")).toBe(false);
    expect(isSecretBindingName("AIzaSyExample")).toBe(false);
    expect(isSecretBindingName("sk-example")).toBe(false);
  });
});
