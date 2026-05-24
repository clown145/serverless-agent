import { errorResponse } from "../../../shared/http";
import type { Env } from "../../../shared/types/env";

export function defaultAgentId(env: Env): string {
  return env.DEFAULT_AGENT_ID ?? "default";
}

export function searchParamsObject(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

export function skillRouteError(code: string, error: unknown, fallback: string): Response {
  return errorResponse(400, code, error instanceof Error ? error.message : fallback);
}
