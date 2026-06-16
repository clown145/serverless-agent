import type { ToolResult } from "../../tools/types";

function isPermissionDeniedToolResult(
  value: unknown
): value is ToolResult & { status: "permission_denied" } {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ToolResult> & Record<string, unknown>;

  if (candidate.status !== "permission_denied") {
    return false;
  }

  // If present, permission_denied error payloads must be real objects.
  const error = candidate.error;
  if (error !== undefined && (error === null || typeof error !== "object")) {
    return false;
  }

  return true;
}

export function formatToolResultForModel(result: unknown, toolName?: string): string {
  if (isPermissionDeniedToolResult(result)) {
    return formatPermissionDeniedForModel(result, toolName);
  }

  // Default behavior for other results
  try {
    return JSON.stringify(result ?? null);
  } catch {
    return JSON.stringify({ error: "Failed to serialize tool result" });
  }
}

function formatPermissionDeniedForModel(result: ToolResult, toolName?: string): string {
  const error = result.error;
  const reason = error?.message ?? "Permission denied";
  const code = error?.code ? ` (code: ${error.code})` : "";

  const effectiveToolName = toolName ?? (result as any).toolName ?? (result as any).name;
  const toolInfo = effectiveToolName ? ` for tool "${effectiveToolName}"` : "";

  return [
    `Permission denied${toolInfo}${code}.`,
    `Reason: ${reason}`,
    "",
    "If this tool or permission is necessary to complete the user's request, clearly explain the limitation to the user and ask them to grant the required permission before continuing.",
    "Do not keep attempting the same restricted action."
  ].join("\n");
}
