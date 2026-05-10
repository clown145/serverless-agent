import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { extractPageContent, readResponseText } from "./extract";
import { fetchPageInputJsonSchema, fetchPageInputSchema } from "./schema";

export function createWebTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "web.fetch_page",
        title: "Fetch Web Page",
        description:
          "Fetch a public HTTP(S) page and extract readable page text for verification or deeper reading after search.",
        inputSchema: fetchPageInputJsonSchema,
        annotations: {
          readOnlyHint: true,
          openWorldHint: true
        },
        permission: { level: 2, scopes: ["web:search"] },
        sideEffect: "none",
        timeoutMs: 15_000
      },
      execute: async (context) => {
        const parsed = fetchPageInputSchema.safeParse(context.input);
        if (!parsed.success) {
          return failed("invalid_input", parsed.error.message, false);
        }

        const urlError = validateFetchUrl(parsed.data.url);
        if (urlError) {
          return failed("invalid_url", urlError, false);
        }

        const response = await fetch(parsed.data.url, {
          headers: {
            accept: "text/html, text/plain, application/json;q=0.8, */*;q=0.5",
            "user-agent": "serverless-agent/0.1"
          },
          redirect: "follow"
        });
        const contentType = response.headers.get("content-type") ?? undefined;
        const { text: body, truncated } = await readResponseText(response);
        const extracted = extractPageContent({
          body,
          contentType,
          baseUrl: response.url || parsed.data.url,
          maxChars: parsed.data.maxChars,
          includeLinks: parsed.data.includeLinks
        });

        return {
          status: response.ok ? "success" : "failed",
          output: {
            url: parsed.data.url,
            finalUrl: response.url || parsed.data.url,
            status: response.status,
            contentType,
            truncated,
            ...extracted
          },
          error: response.ok
            ? undefined
            : {
                code: "fetch_failed",
                message: `Fetch failed with ${response.status}`,
                retryable: response.status >= 500
              }
        };
      }
    })
  ];
}

function validateFetchUrl(input: string): string | undefined {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only HTTP and HTTPS URLs are supported";
  }

  if (isBlockedHostname(url.hostname)) {
    return "Local or private network URLs are not allowed";
  }

  return undefined;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    return true;
  }

  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}

