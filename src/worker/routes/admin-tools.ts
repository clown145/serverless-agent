import { createToolCatalog } from "../../tools/catalog/tool-catalog";
import { createToolRegistry } from "../../tools/registry/tool-registry";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { requireAdmin } from "../admin-auth";

export async function handleAdminTools(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const registry = createToolRegistry(env);
  return jsonResponse({
    ok: true,
    tools: createToolCatalog(registry.list())
  });
}
