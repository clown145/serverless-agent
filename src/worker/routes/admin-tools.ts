import { createToolCatalog } from "../../tools/catalog/tool-catalog";
import { createRuntimeToolRegistry } from "../../tools/registry/tool-registry";
import { jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";

export async function handleAdminTools(
  request: Request,
  env: Env
): Promise<Response> {
  const registry = await createRuntimeToolRegistry(env);
  return jsonResponse({
    ok: true,
    tools: createToolCatalog(registry.list())
  });
}
