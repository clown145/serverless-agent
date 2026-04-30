import type { Env } from "../shared/types/env";
import { errorResponse } from "../shared/http";

export function requireAdmin(request: Request, env: Env): Response | undefined {
  const auth = request.headers.get("authorization");

  if (env.INTERNAL_ADMIN_TOKEN && auth !== `Bearer ${env.INTERNAL_ADMIN_TOKEN}`) {
    return errorResponse(401, "unauthorized", "Invalid admin token");
  }

  return undefined;
}
