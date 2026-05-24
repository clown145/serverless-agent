import type { Env } from "../shared/types/env";
import { errorResponse } from "../shared/http";

export function requireAdmin(request: Request, env: Env): Response | undefined {
  const auth = request.headers.get("authorization");

  if (env.INTERNAL_ADMIN_TOKEN && auth !== `Bearer ${env.INTERNAL_ADMIN_TOKEN}`) {
    return errorResponse(401, "unauthorized", "Invalid admin token");
  }

  return undefined;
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function requireAdminRoute(
  request: Request,
  env: Env,
  pathname = new URL(request.url).pathname
): Response | undefined {
  return isAdminApiPath(pathname) ? requireAdmin(request, env) : undefined;
}
