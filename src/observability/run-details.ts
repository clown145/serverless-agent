import { getRunDetailRows } from "../storage/repositories/run-details-repository";
import { createRunDiagnostics, type RunDiagnostics } from "./run-diagnostics";

export type RunDetails = {
  run: Record<string, unknown>;
  steps: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  triggerMessage?: Record<string, unknown>;
  conversation?: Record<string, unknown>;
  diagnostics: RunDiagnostics;
};

export async function getRunDetails(
  db: D1Database,
  runId: string
): Promise<RunDetails | undefined> {
  const rows = await getRunDetailRows(db, runId);
  if (!rows) {
    return undefined;
  }

  return {
    ...rows,
    diagnostics: createRunDiagnostics(rows)
  };
}
