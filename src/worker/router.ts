import type { Env } from "../shared/types/env";
import { errorResponse } from "../shared/http";
import { requireAdminRoute } from "./admin-auth";
import { handleAdminRoute } from "./routes/admin-routes";
import { handlePublicRoute } from "./routes/public-routes";
import { handleRootRoute } from "./routes/root-routes";

export async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  const publicResponse = await handlePublicRoute(request, env, ctx);
  if (publicResponse) {
    return publicResponse;
  }

  const authError = requireAdminRoute(request, env, url.pathname);
  if (authError) {
    return authError;
  }

  const adminResponse = await handleAdminRoute(request, env, ctx);
  if (adminResponse) {
    return adminResponse;
  }

  const rootResponse = handleRootRoute(request);
  if (rootResponse) {
    return rootResponse;
  }

  return errorResponse(404, "not_found", "Route not found");
}
