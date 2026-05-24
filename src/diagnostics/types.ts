export type DiagnosticStatus = "ok" | "warn" | "error";

export type DiagnosticCategory =
  | "runtime"
  | "model"
  | "search"
  | "platforms"
  | "workspace"
  | "mcp"
  | "activity";

export type DiagnosticCheck = {
  id: string;
  category: DiagnosticCategory;
  label: string;
  status: DiagnosticStatus;
  detail: string;
  action?: string;
};

export type DiagnosticSummary = Record<DiagnosticStatus, number> & {
  total: number;
};

export function summarizeDiagnostics(checks: DiagnosticCheck[]): DiagnosticSummary {
  return checks.reduce<DiagnosticSummary>(
    (summary, check) => {
      summary[check.status] += 1;
      summary.total += 1;
      return summary;
    },
    { ok: 0, warn: 0, error: 0, total: 0 }
  );
}
