import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import {
  safeHttpRequest,
  type HttpRequestBody,
  type SafeHttpResponse
} from "./client";
import {
  httpRequestInputJsonSchema,
  httpRequestInputSchema,
  type HttpRequestInput
} from "./schema";
import { validateFetchUrl } from "./url-safety";

export function createHttpTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "http.request",
        title: "HTTP Request",
        description:
          "Send an HTTP(S) request to a public internet endpoint. Local and private network addresses are blocked.",
        inputSchema: httpRequestInputJsonSchema,
        annotations: {
          openWorldHint: true
        },
        permission: { level: 4, scopes: ["http:request"] },
        sideEffect: "external_write",
        timeoutMs: 35_000
      },
      execute: async (context) => {
        const parsed = httpRequestInputSchema.safeParse(context.input);
        if (!parsed.success) {
          return failed("invalid_input", parsed.error.message, false);
        }

        const url = buildUrl(parsed.data);
        const urlError = validateFetchUrl(url);
        if (urlError) {
          return failed("invalid_url", urlError, false);
        }

        try {
          const result = await safeHttpRequest({
            env: context.env,
            agentId: context.agentId,
            url,
            method: parsed.data.method,
            headers: parsed.data.headers,
            body: requestBody(parsed.data),
            cookieJar: parsed.data.cookieJar,
            maxBytes: parsed.data.maxBytes,
            maxRedirects: parsed.data.maxRedirects,
            timeoutMs: parsed.data.timeoutMs
          });

          return {
            status: result.ok ? "success" : "failed",
            output: responseOutput(result),
            error: result.ok
              ? undefined
              : {
                  code: "http_error",
                  message: `HTTP request failed with ${result.status}`,
                  retryable: result.status >= 500 || result.status === 429
                }
          };
        } catch (error) {
          return failed(
            "http_request_failed",
            error instanceof Error ? error.message : "HTTP request failed",
            true
          );
        }
      }
    })
  ];
}

function buildUrl(input: HttpRequestInput): string {
  const url = new URL(input.url);
  for (const [key, value] of Object.entries(input.query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function requestBody(input: HttpRequestInput): HttpRequestBody {
  switch (input.bodyType) {
    case "json":
      return { kind: "json", value: input.json ?? null };
    case "text":
      return { kind: "text", value: input.text ?? "" };
    case "form":
      return { kind: "form", value: input.form ?? {} };
    case "base64":
      return { kind: "base64", value: input.base64 ?? "" };
    case "multipart":
      return { kind: "multipart", parts: input.multipart ?? [] };
    case "none":
      return { kind: "empty" };
  }
}

function responseOutput(result: SafeHttpResponse): Record<string, unknown> {
  const output: Record<string, unknown> = {
    url: result.url,
    finalUrl: result.finalUrl,
    status: result.status,
    statusText: result.statusText,
    ok: result.ok,
    contentType: result.contentType,
    headers: result.headers,
    redirectChain: result.redirectChain,
    bodyText: result.bodyText,
    truncated: result.truncated
  };

  if (result.bodyJson !== undefined) {
    output.bodyJson = result.bodyJson;
  }

  return output;
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
