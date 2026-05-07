import { afterEach, describe, expect, it, vi } from "vitest";
import { TavilySearchProvider } from "../../src/tools/search/tavily-provider";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Tavily search provider", () => {
  it("sends search requests with bearer auth and normalizes results", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          query: "cloudflare workers",
          results: [
            {
              title: "Cloudflare Workers",
              url: "https://workers.cloudflare.com",
              content: "Serverless platform",
              score: 0.9,
              raw_content: null,
              favicon: "https://workers.cloudflare.com/favicon.ico"
            }
          ],
          response_time: "1.2",
          request_id: "req-1"
        }),
        { headers: { "content-type": "application/json" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new TavilySearchProvider({
      apiKey: "tvly-test",
      baseUrl: "https://api.tavily.com/search"
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
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tvly-test");
    expect(JSON.parse(String(init.body))).toMatchObject({
      query: "cloudflare workers",
      search_depth: "basic",
      max_results: 3,
      include_favicon: true
    });
    expect(result).toMatchObject({
      provider: "tavily",
      query: "cloudflare workers",
      responseTime: 1.2,
      results: [
        {
          title: "Cloudflare Workers",
          url: "https://workers.cloudflare.com"
        }
      ]
    });
  });
});
