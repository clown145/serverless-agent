import { builtinTool } from "../builtin/source";
import type { RegisteredTool, ToolResult } from "../types";
import { timeNowInputJsonSchema, timeNowInputSchema } from "./schema";

export function createTimeTools(): RegisteredTool[] {
  return [
    builtinTool({
      definition: {
        name: "time.now",
        title: "Current Time",
        description:
          "Get the current date and time. Use this before answering time-sensitive questions or creating schedules from relative dates.",
        inputSchema: timeNowInputJsonSchema,
        annotations: {
          readOnlyHint: true,
          openWorldHint: false
        },
        permission: { level: 1, scopes: [] },
        sideEffect: "none",
        timeoutMs: 1_000
      },
      execute: async (context) => {
        const parsed = timeNowInputSchema.safeParse(context.input);
        if (!parsed.success) {
          return failed("invalid_input", parsed.error.message, false);
        }

        const timeZone = (parsed.data.timeZone ?? context.env.AGENT_TIMEZONE?.trim()) || "UTC";
        if (!isValidTimeZone(timeZone)) {
          return failed("invalid_timezone", `Invalid timezone: ${timeZone}`, false);
        }

        const now = new Date();
        return {
          status: "success",
          output: {
            iso: now.toISOString(),
            unixMs: now.getTime(),
            unixSeconds: Math.floor(now.getTime() / 1000),
            timeZone,
            local: formatDateTime(now, timeZone),
            date: formatDate(now, timeZone),
            time: formatTime(now, timeZone)
          }
        };
      }
    })
  ];
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone
  }).format(date);
}

function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone
  }).format(date);
}

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeStyle: "medium",
    timeZone
  }).format(date);
}

function failed(code: string, message: string, retryable: boolean): ToolResult {
  return {
    status: "failed",
    error: { code, message, retryable }
  };
}
