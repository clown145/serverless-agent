import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { createSearchProvider } from "./provider-factory";
import { webSearchInputJsonSchema, webSearchInputSchema } from "./schema";

export function createSearchTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "search.web",
        title: "Web Search",
        description: "Search the public web through the configured search provider.",
        inputSchema: webSearchInputJsonSchema,
        annotations: {
          readOnlyHint: true,
          openWorldHint: true
        },
        permission: { level: 2, scopes: ["web:search"] },
        sideEffect: "none",
        timeoutMs: 15_000
      },
      execute: async (context) => {
        const parsed = webSearchInputSchema.safeParse(context.input);
        if (!parsed.success) {
          return failed("invalid_input", parsed.error.message, false);
        }

        const provider = await createSearchProvider(context.env, context.agentId);
        const result = await provider.search(parsed.data);
        return { status: "success", output: result };
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
