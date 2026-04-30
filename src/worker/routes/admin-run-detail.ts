import { getRunDetails } from "../../storage/repositories/run-details-repository";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

export async function handleAdminRunDetail(
  request: Request,
  env: Env,
  runId: string
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const details = await getRunDetails(env.AGENT_DB, runId);
  if (!details) {
    return errorResponse(404, "run_not_found", "Run not found");
  }

  return jsonResponse({ ok: true, ...details });
}
