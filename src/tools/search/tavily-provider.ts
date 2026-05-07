import type { SearchProvider } from "./provider-types";
import type { WebSearchInput } from "./schema";

type TavilyProviderOptions = {
  apiKey: string;
  baseUrl?: string;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string;
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    raw_content?: string | null;
    favicon?: string;
  }>;
  response_time?: number | string;
  request_id?: string;
  usage?: unknown;
  error?: { message?: string };
};

export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily" as const;
  private readonly baseUrl: string;

  constructor(private readonly options: TavilyProviderOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.tavily.com/search";
  }

  async search(input: WebSearchInput) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify(toTavilyRequest(input))
    });
    const payload = (await response.json().catch(() => undefined)) as
      | TavilySearchResponse
      | undefined;

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ?? `Tavily search failed with ${response.status}`
      );
    }

    return {
      provider: this.name,
      query: payload?.query ?? input.query,
      answer: payload?.answer,
      results: (payload?.results ?? [])
        .filter((result) => result.url)
        .map((result) => ({
          title: result.title ?? result.url ?? "Untitled",
          url: result.url ?? "",
          content: result.content,
          score: result.score,
          rawContent: result.raw_content,
          favicon: result.favicon
        })),
      responseTime:
        typeof payload?.response_time === "string"
          ? Number(payload.response_time)
          : payload?.response_time,
      requestId: payload?.request_id,
      usage: payload?.usage
    };
  }
}

function toTavilyRequest(input: WebSearchInput): Record<string, unknown> {
  return {
    query: input.query,
    search_depth: input.searchDepth,
    max_results: input.maxResults,
    topic: input.topic,
    time_range: input.timeRange,
    include_answer: input.includeAnswer,
    include_raw_content: input.includeRawContent,
    include_images: false,
    include_favicon: true,
    include_domains: input.includeDomains,
    exclude_domains: input.excludeDomains,
    include_usage: true
  };
}
