import { describe, expect, it } from "vitest";
import { promptText, renderPrompt, renderPromptTemplate, resolvePrompt } from "../../src/prompts";

describe("prompts", () => {
  it("resolves generated prompt metadata", () => {
    const prompt = resolvePrompt("agent/base");

    expect(prompt.id).toBe("agent/base");
    expect(prompt.source).toMatch(/^(default|override)$/u);
    expect(prompt.checksum).toMatch(/^[a-f0-9]{64}$/u);
    expect(prompt.content).toContain("You are serverless-agent");
  });

  it("renders simple template variables", () => {
    expect(
      renderPromptTemplate("Hello {{ name }} from {{place}}.", {
        name: "agent",
        place: "Cloudflare"
      })
    ).toBe("Hello agent from Cloudflare.");
  });

  it("renders agent base prompt without leaving known placeholders", () => {
    const prompt = renderPrompt("agent/base", {
      runtime_context: "Current platform: webui",
      platform_format_instruction: promptText("platforms/webui")
    });

    expect(prompt.content).toContain("Current platform: webui");
    expect(prompt.content).toContain("WebUI formatting");
    expect(prompt.content).not.toContain("{{runtime_context}}");
    expect(prompt.content).not.toContain("{{platform_format_instruction}}");
  });
});
