import { runConfigDiagnostics } from "../../diagnostics/config-checks";
import { runBindingDiagnostics } from "../../diagnostics/runtime-checks";
import { summarizeDiagnostics } from "../../diagnostics/types";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";

export async function handleAdminDiagnostics(request: Request, env: Env): Promise<Response> {
  const [bindingChecks, configChecks] = await Promise.all([
    runBindingDiagnostics(env),
    runConfigDiagnostics(env)
  ]);
  const checks = [...bindingChecks, ...configChecks];
  const summary = summarizeDiagnostics(checks);

  return jsonResponse({
    ok: true,
    checks,
    summary,
    healthy: summary.error === 0
  });
}
