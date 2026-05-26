import { describe, expect, it } from "vitest";
import type { ToolCatalogItem } from "../../apps/admin-web/src/api/types";
import { createToolInputDraft } from "../../apps/admin-web/src/ui/panels/tools/toolInputDefaults";

describe("tool input defaults", () => {
  it("uses built-in examples for common tools", () => {
    expect(createToolInputDraft(tool("search.web"))).toMatchObject({
      query: "Cloudflare Workers serverless agent",
      maxResults: 3
    });
    expect(createToolInputDraft(tool("web.fetch_page"))).toMatchObject({
      urls: ["https://workers.cloudflare.com", "https://developers.cloudflare.com/workers/"],
      maxChars: 6000
    });
    expect(createToolInputDraft(tool("http.request"))).toMatchObject({
      url: "https://api.github.com/repos/cloudflare/workers-sdk",
      method: "GET",
      bodyType: "none"
    });
    expect(createToolInputDraft(tool("messaging.send_file"))).toMatchObject({
      platform: "telegram",
      source: {
        type: "vfs"
      }
    });
    expect(createToolInputDraft(tool("weixin_oc.send_image"))).toMatchObject({
      source: {
        type: "url"
      },
      caption: "image"
    });
  });

  it("falls back to required JSON schema properties", () => {
    expect(
      createToolInputDraft({
        ...tool("custom.lookup"),
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "integer", minimum: 1 }
          },
          required: ["query", "limit"]
        }
      })
    ).toEqual({ query: "", limit: 1 });
  });
});

function tool(name: string): ToolCatalogItem {
  return {
    name,
    description: name,
    inputSchema: { type: "object" },
    source: { type: "builtin", id: "builtin", name: "Built-in" },
    permission: { level: 1, scopes: [] },
    sideEffect: "none",
    timeoutMs: 1000
  };
}
