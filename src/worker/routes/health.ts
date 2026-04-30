import { jsonResponse } from "../../shared/http";

export function handleHealth(): Response {
  return jsonResponse({
    ok: true,
    service: "serverless-agent"
  });
}
