import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { executeFetchPageInput } from "./fetch-page";
import { fetchPageInputJsonSchema, fetchPageInputSchema } from "./schema";

export function createWebTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "web.fetch_page",
        title: "Fetch Web Page",
        description:
          "Fetch one or up to ten public HTTP(S) pages and extract readable page text for verification or deeper reading after search.",
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

        return executeFetchPageInput(context, parsed.data);
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
