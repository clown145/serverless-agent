import type { ToolResult } from "../../tools/types";

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

function isToolResult(value: unknown): value is ToolResult {
  return (
    value !== null &&
    typeof value === "object" &&
    "status" in value &&
    typeof (value as any).status === "string"
  );
}

function formatPermissionDeniedForModel(result: ToolResult): string {
  const error = result.error;
  const reason = error?.message ?? "Permission denied";

  return [
    "Permission denied for this tool.",
    `Reason: ${reason}`,
    "",
    "If this tool or permission is necessary to complete the user's request, clearly explain the limitation to the user and ask them to grant the required permission before continuing.",
    "Do not keep attempting the same restricted action."
  ].join("\n");
}
