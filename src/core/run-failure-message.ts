import type { D1Database } from "@cloudflare/workers-types";

const MODEL_ERROR_HINTS = ["openai", "gemini", "provider", "model", "api error"];

export async function getUserFacingFailureMessage(
  runId: string,
  originalError: string,
  db: D1Database
): Promise<string> {
  const hadPermissionDenied = await hasPermissionDeniedToolCall(runId, db);

  if (hadPermissionDenied && looksLikeModelError(originalError)) {
    return "Run failed: insufficient permissions for required tools";
  }

  if (hadPermissionDenied) {
    // Even if not model error, make it clearer
    return `Run failed: insufficient permissions for required tools (${originalError})`;
  }

  return `Run failed: ${originalError}`;
}

async function hasPermissionDeniedToolCall(runId: string, db: D1Database): Promise<boolean> {
  try {
    const row = await db
      .prepare(
        `SELECT 1 FROM tool_calls 
         WHERE run_id = ? AND status = 'permission_denied' 
         LIMIT 1`
      )
      .bind(runId)
      .first();

    return !!row;
  } catch {
    return false;
  }
}

function looksLikeModelError(message: string): boolean {
  const lower = message.toLowerCase();
  return MODEL_ERROR_HINTS.some((hint) => lower.includes(hint));
}
