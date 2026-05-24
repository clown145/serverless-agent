export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(
    {
      ok: false,
      error: { code, message }
    },
    { status }
  );
}
