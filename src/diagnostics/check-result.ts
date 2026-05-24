import type { DiagnosticCategory, DiagnosticCheck, DiagnosticStatus } from "./types";

export function diagnosticOk(
  category: DiagnosticCategory,
  id: string,
  label: string,
  detail: string,
  action?: string
): DiagnosticCheck {
  return diagnosticCheck(category, id, label, "ok", detail, action);
}

export function diagnosticWarn(
  category: DiagnosticCategory,
  id: string,
  label: string,
  detail: string,
  action?: string
): DiagnosticCheck {
  return diagnosticCheck(category, id, label, "warn", detail, action);
}

export function diagnosticError(
  category: DiagnosticCategory,
  id: string,
  label: string,
  detail: string,
  action?: string
): DiagnosticCheck {
  return diagnosticCheck(category, id, label, "error", detail, action);
}

export function diagnosticErrorFromUnknown(
  category: DiagnosticCategory,
  id: string,
  label: string,
  error: unknown,
  action?: string
): DiagnosticCheck {
  return diagnosticError(
    category,
    id,
    label,
    error instanceof Error ? error.message : String(error),
    action
  );
}

function diagnosticCheck(
  category: DiagnosticCategory,
  id: string,
  label: string,
  status: DiagnosticStatus,
  detail: string,
  action?: string
): DiagnosticCheck {
  return {
    id,
    category,
    label,
    status,
    detail,
    action
  };
}
