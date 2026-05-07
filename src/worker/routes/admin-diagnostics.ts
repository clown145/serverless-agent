import { runRuntimeDiagnostics } from "../../diagnostics/runtime-checks";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

export async function handleAdminDiagnostics(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const checks = await runRuntimeDiagnostics(env);
  return jsonResponse({
    ok: true,
    checks,
    healthy: checks.every((check) => check.status !== "error")
  });
}
