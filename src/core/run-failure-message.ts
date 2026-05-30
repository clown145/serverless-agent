import type { D1Database } from "@cloudflare/workers-types";

const MODEL_ERROR_PATTERNS = [
  "openai_error",
  "gemini_error",
  "model_error",
  "api_error",
  "rate limit",
  "quota exceeded",
  "context length",
  "token limit exceeded",
  "timeout",
  "429",
];

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
    // Check tool_calls table (most common case, including policy denials)
    const toolCallRow = await db
      .prepare(
        `SELECT 1 FROM tool_calls 
         WHERE run_id = ? 
           AND (status = 'permission_denied' OR error_code IN ('permission_denied', 'skill_tool_not_allowed'))
         LIMIT 1`
      )
      .bind(runId)
      .first();

    if (toolCallRow) return true;

    // Also check run_steps for skill-level and other denied cases
    // (some permission denials are recorded here with summary_status)
    const stepRow = await db
      .prepare(
        `SELECT 1 FROM run_steps 
         WHERE run_id = ? 
           AND (summary_status = 'skill_denied' 
                OR summary LIKE '%permission_denied%' 
                OR summary LIKE '%denied%')
         LIMIT 1`
      )
      .bind(runId)
      .first();

    return !!stepRow;
  } catch {
    return false;
  }
}

function looksLikeModelError(message: string): boolean {
  const lower = message.toLowerCase();
  return MODEL_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}
