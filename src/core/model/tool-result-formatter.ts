import type { ToolResult } from "../../tools/types";

const PERMISSION_DENIED_STATUSES = new Set<string>(["permission_denied"]);

function isToolResult(value: unknown): value is ToolResult {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ToolResult> & Record<string, unknown>;

  if (typeof candidate.status !== "string") {
    return false;
  }

  // Only treat objects that have a known permission_denied status as ToolResult for this formatter
  if (!PERMISSION_DENIED_STATUSES.has(candidate.status)) {
    return false;
  }

  // Require at least one additional identifier to avoid matching random objects
  const hasIdentifier =
    typeof candidate.toolName === "string" ||
    typeof (candidate as any).name === "string" ||
    typeof candidate.error === "object";

  return hasIdentifier;
}

export function formatToolResultForModel(result: unknown): string {
  if (isToolResult(result) && result.status === "permission_denied") {
    return formatPermissionDeniedForModel(result);
  }

  // Default behavior for other results
  try {
    return JSON.stringify(result ?? null);
  } catch {
    return JSON.stringify({ error: "Failed to serialize tool result" });
  }
}

function formatPermissionDeniedForModel(result: ToolResult): string {
  const error = result.error;
  const reason = error?.message ?? "Permission denied";
  const code = error?.code ? ` (code: ${error.code})` : "";

  const toolInfo = (result as any).toolName ? ` for tool "${(result as any).toolName}"` : "";

  return [
    `Permission denied${toolInfo}${code}.`,
    `Reason: ${reason}`,
    "",
    "If this tool or permission is necessary to complete the user's request, clearly explain the limitation to the user and ask them to grant the required permission before continuing.",
    "Do not keep attempting the same restricted action."
  ].join("\n");
}
