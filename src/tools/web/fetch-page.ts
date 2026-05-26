import { safeHttpRequest } from "../http/client";
import { validateFetchUrl } from "../http/url-safety";
import type { ToolExecutionContext, ToolResult } from "../types";
import { extractPageContent } from "./extract";
import type { FetchPageInput } from "./schema";

type FetchPageOptions = {
  maxChars: number;
  includeLinks: boolean;
};

type FetchPageSuccess = {
  url: string;
  finalUrl: string;
  status: number;
  contentType?: string;
  truncated: boolean;
  title?: string;
  description?: string;
  text: string;
  links?: Array<{ text: string; url: string }>;
};

type FetchPageFailure = {
  url: string;
  finalUrl?: string;
  status?: number;
  contentType?: string;
  truncated?: boolean;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

type FetchPageOutput = FetchPageSuccess | FetchPageFailure;

const FETCH_PAGE_CONCURRENCY = 3;

export async function executeFetchPageInput(
  context: ToolExecutionContext,
  input: FetchPageInput
): Promise<ToolResult> {
  const urls = normalizeFetchPageUrls(input);
  const options = {
    maxChars: input.maxChars,
    includeLinks: input.includeLinks
  };

  const pages = await mapWithConcurrency(urls, FETCH_PAGE_CONCURRENCY, (url) =>
    fetchPage(context, url, options)
  );
  const failedCount = pages.filter((page) => "error" in page).length;

  return {
    status: failedCount === pages.length ? "failed" : "success",
    output: {
      pages,
      failedCount
    },
    error:
      failedCount === pages.length
        ? {
            code: "fetch_failed",
            message: "All page fetches failed",
            retryable: pages.some((page) => "error" in page && page.error.retryable)
          }
        : undefined
  };
}

function normalizeFetchPageUrls(input: FetchPageInput): string[] {
  return input.urls;
}

async function fetchPage(
  context: ToolExecutionContext,
  url: string,
  options: FetchPageOptions
): Promise<FetchPageOutput> {
  const urlError = validateFetchUrl(url);
  if (urlError) {
    return {
      url,
      error: {
        code: "invalid_url",
        message: urlError,
        retryable: false
      }
    };
  }

  const response = await fetchPageResponse(context, url);
  if ("error" in response) {
    return response;
  }

  const extracted = extractPageContent({
    body: response.bodyText,
    contentType: response.contentType,
    baseUrl: response.finalUrl,
    maxChars: options.maxChars,
    includeLinks: options.includeLinks
  });

  if (!response.ok) {
    return {
      url,
      finalUrl: response.finalUrl,
      status: response.status,
      contentType: response.contentType,
      truncated: response.truncated,
      error: {
        code: "fetch_failed",
        message: `Fetch failed with ${response.status}`,
        retryable: response.status >= 500
      }
    };
  }

  return {
    url,
    finalUrl: response.finalUrl,
    status: response.status,
    contentType: response.contentType,
    truncated: response.truncated,
    ...extracted
  };
}

async function fetchPageResponse(
  context: ToolExecutionContext,
  url: string
): Promise<
  | Awaited<ReturnType<typeof safeHttpRequest>>
  | {
      url: string;
      error: {
        code: string;
        message: string;
        retryable: boolean;
      };
    }
> {
  try {
    return await safeHttpRequest({
      env: context.env,
      agentId: context.agentId,
      url,
      method: "GET",
      headers: {
        accept: "text/html, text/plain, application/json;q=0.8, */*;q=0.5",
        "user-agent": "serverless-agent/0.1"
      },
      body: { kind: "empty" },
      maxBytes: 1_000_000,
      timeoutMs: 15_000,
      maxRedirects: 5
    });
  } catch (error) {
    return {
      url,
      error: {
        code: "fetch_error",
        message: error instanceof Error ? error.message : "Fetch failed",
        retryable: true
      }
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => worker())
  );
  return results;
}
