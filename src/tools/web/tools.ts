import { builtinTool } from "../builtin/source";
import { safeHttpRequest } from "../http/client";
import { validateFetchUrl } from "../http/url-safety";
import type { RegisteredTool, ToolResult } from "../types";
import { extractPageContent } from "./extract";
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

        const response = await safeHttpRequest({
          env: context.env,
          agentId: context.agentId,
          url: parsed.data.url,
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
        const extracted = extractPageContent({
          body: response.bodyText,
          contentType: response.contentType,
          baseUrl: response.finalUrl,
          maxChars: parsed.data.maxChars,
          includeLinks: parsed.data.includeLinks
        });

        return {
          status: response.ok ? "success" : "failed",
          output: {
            url: parsed.data.url,
            finalUrl: response.finalUrl,
            status: response.status,
            contentType: response.contentType,
            truncated: response.truncated,
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

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
