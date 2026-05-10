import type { SearchProvider } from "./provider-types";
import type { WebSearchInput } from "./schema";

type ExaProviderOptions = {
  apiKey: string;
  baseUrl?: string;
};

type ExaSearchResponse = {
  requestId?: string;
  results?: ExaSearchResult[];
  searchType?: string;
  context?: string;
  costDollars?: unknown;
  error?: string | { message?: string };
  message?: string;
};

type ExaSearchResult = {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  score?: number;
  favicon?: string;
};

export class ExaSearchProvider implements SearchProvider {
  readonly name = "exa" as const;
  private readonly baseUrl: string;

  constructor(private readonly options: ExaProviderOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.exa.ai/search";
  }

  async search(input: WebSearchInput) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey
      },
      body: JSON.stringify(toExaRequest(input))
    });
    const payload = (await response.json().catch(() => undefined)) as
      | ExaSearchResponse
      | undefined;

    if (!response.ok) {
      throw new Error(exaErrorMessage(response.status, payload));
    }

    return {
      provider: this.name,
      query: input.query,
      answer: payload?.context,
      results: (payload?.results ?? [])
        .filter((result) => result.url)
        .map((result) => ({
          title: result.title ?? result.url ?? "Untitled",
          url: result.url ?? "",
          content: result.highlights?.[0] ?? trimContent(result.text),
          score: result.score ?? result.highlightScores?.[0],
          rawContent: input.includeRawContent ? result.text ?? null : undefined,
          favicon: result.favicon
        })),
      requestId: payload?.requestId,
      usage: payload?.costDollars
    };
  }
}

function toExaRequest(input: WebSearchInput): Record<string, unknown> {
  return compact({
    query: input.query,
    type: mapSearchType(input.searchDepth),
    category: mapCategory(input.topic),
    numResults: input.maxResults,
    includeDomains: input.includeDomains,
    excludeDomains: input.excludeDomains,
    startPublishedDate: startDateForRange(input.timeRange),
    text: true,
    context: input.includeAnswer
  });
}

function mapSearchType(searchDepth: WebSearchInput["searchDepth"]): string {
  if (searchDepth === "advanced") {
    return "deep";
  }

  if (searchDepth === "fast" || searchDepth === "ultra-fast") {
    return "fast";
  }

  return "auto";
}

function mapCategory(topic: WebSearchInput["topic"]): string | undefined {
  if (topic === "news") {
    return "news";
  }

  if (topic === "finance") {
    return "financial report";
  }

  return undefined;
}

function startDateForRange(range?: WebSearchInput["timeRange"]): string | undefined {
  if (!range) {
    return undefined;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const offsets: Record<NonNullable<WebSearchInput["timeRange"]>, number> = {
    day: dayMs,
    d: dayMs,
    week: 7 * dayMs,
    w: 7 * dayMs,
    month: 30 * dayMs,
    m: 30 * dayMs,
    year: 365 * dayMs,
    y: 365 * dayMs
  };

  return new Date(now - offsets[range]).toISOString();
}

function trimContent(content?: string): string | undefined {
  if (!content) {
    return undefined;
  }

  return content.length > 1200 ? `${content.slice(0, 1200)}...` : content;
}

function exaErrorMessage(status: number, payload?: ExaSearchResponse): string {
  if (typeof payload?.error === "string") {
    return `Exa search failed with ${status}: ${payload.error}`;
  }

  const message = payload?.error?.message ?? payload?.message;
  return message
    ? `Exa search failed with ${status}: ${message}`
    : `Exa search failed with ${status}`;
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}
