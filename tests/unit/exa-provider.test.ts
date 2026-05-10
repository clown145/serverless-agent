import { afterEach, describe, expect, it, vi } from "vitest";
import { ExaSearchProvider } from "../../src/tools/search/exa-provider";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Exa search provider", () => {
  it("sends search requests with x-api-key auth and normalizes results", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          requestId: "exa-req-1",
          searchType: "auto",
          results: [
            {
              title: "Cloudflare Workers",
              url: "https://workers.cloudflare.com",
              text: "Serverless platform for global applications",
              score: 0.91,
              favicon: "https://workers.cloudflare.com/favicon.ico"
            }
          ],
          costDollars: { total: 0.005 }
        }),
        { headers: { "content-type": "application/json" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new ExaSearchProvider({
      apiKey: "exa-test",
      baseUrl: "https://api.exa.ai/search"
    });
    const result = await provider.search({
      query: "cloudflare workers",
      maxResults: 3,
      searchDepth: "basic",
      topic: "general",
      includeAnswer: false,
      includeRawContent: false
    });

    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const init = call[1];
    expect(new Headers(init.headers).get("x-api-key")).toBe("exa-test");
    expect(JSON.parse(String(init.body))).toMatchObject({
      query: "cloudflare workers",
      type: "auto",
      numResults: 3,
      text: true
    });
    expect(result).toMatchObject({
      provider: "exa",
      query: "cloudflare workers",
      requestId: "exa-req-1",
      results: [
        {
          title: "Cloudflare Workers",
          url: "https://workers.cloudflare.com",
          content: "Serverless platform for global applications"
        }
      ]
    });
  });
});
