import type { D1Database } from "@cloudflare/workers-types";
import { looksLikeModelProviderError } from "./model/model-error-classifier";

export async function getUserFacingFailureMessage(
  runId: string,
  originalError: string,
  db: D1Database
): Promise<string> {
  const check = await hasPermissionDeniedToolCall(runId, db);

  if (check.hadPermissionDenied && looksLikeModelProviderError(originalError)) {
    return "Run failed: insufficient permissions for required tools";
  }

  if (check.hadPermissionDenied) {
    // Even if not model error, make it clearer
    return `Run failed: insufficient permissions for required tools (${originalError})`;
  }

  return `Run failed: ${originalError}`;
}

async function hasPermissionDeniedToolCall(
  runId: string,
  db: D1Database
): Promise<{ hadPermissionDenied: boolean; dbError?: unknown }> {
  try {
    // Run both checks in parallel for better performance
    const [toolCallRow, stepRow] = await Promise.all([
      // Check tool_calls table (policy denials + most tool-level denials)
      db
        .prepare(
          `SELECT 1 FROM tool_calls 
           WHERE run_id = ? 
             AND (status = 'permission_denied' 
                  OR error_code IN ('permission_denied', 'skill_tool_not_allowed'))
           LIMIT 1`
        )
        .bind(runId)
        .first(),

      // Check run_steps for recorded denials (skill restrictions etc.)
      // These are written as failed steps with summary in format "toolName: skill_denied"
      db
        .prepare(
          `SELECT 1 FROM run_steps 
           WHERE run_id = ? 
             AND kind = 'tool_completed'
             AND status = 'failed'
             AND (summary LIKE '%: skill_denied' 
                  OR summary LIKE '%: permission_denied')
           LIMIT 1`
        )
        .bind(runId)
        .first()
    ]);

    return { hadPermissionDenied: !!toolCallRow || !!stepRow };
  } catch (err) {
    // Distinguish DB errors from "no permission_denied found"
    console.error(`[hasPermissionDeniedToolCall] DB query failed for run ${runId}:`, err);
    return { hadPermissionDenied: false, dbError: err };
  }
}
