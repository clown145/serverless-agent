import { errorResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";

export async function handleAdminUi(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return errorResponse(503, "assets_not_configured", "Admin UI assets are not configured");
  }

  const url = new URL(request.url);
  url.pathname = "/";
  url.search = "";

  return env.ASSETS.fetch(new Request(url, request));
}
