import type { McpAuthType } from "../../storage/repositories/mcp-types";

export type McpHttpAuth = {
  authType: McpAuthType;
  authHeader?: string;
  credential?: string;
};

export type McpSession = {
  protocolVersion: string;
  sessionId?: string;
};

type JsonRpcResponse<T> = {
  id?: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

export async function mcpPost<T = unknown>(input: {
  url: string;
  auth: McpHttpAuth;
  session?: McpSession;
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}): Promise<{ result?: T; sessionId?: string }> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: requestHeaders(input),
    body: JSON.stringify(requestBody(input))
  });

  if (input.id === undefined && response.status === 202) {
    return { sessionId: response.headers.get("Mcp-Session-Id") ?? undefined };
  }

  const payload = await readMcpResponse<T>(response, input.id);
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `MCP HTTP ${response.status}`);
  }

  if (payload.error) {
    throw new Error(payload.error.message);
  }

  return {
    result: payload.result,
    sessionId: response.headers.get("Mcp-Session-Id") ?? undefined
  };
}

function requestBody(input: {
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}): Record<string, unknown> {
  return input.id === undefined
    ? { jsonrpc: "2.0", method: input.method, params: input.params }
    : { jsonrpc: "2.0", id: input.id, method: input.method, params: input.params };
}

function requestHeaders(input: {
  auth: McpHttpAuth;
  session?: McpSession;
  method: string;
  params?: Record<string, unknown>;
}): Headers {
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "Mcp-Method": input.method
  });

  if (input.session?.protocolVersion) {
    headers.set("MCP-Protocol-Version", input.session.protocolVersion);
  }

  if (input.session?.sessionId) {
    headers.set("Mcp-Session-Id", input.session.sessionId);
  }

  const name = typeof input.params?.name === "string" ? input.params.name : undefined;
  if (name) {
    headers.set("Mcp-Name", name);
  }

  if (input.auth.authType === "bearer" && input.auth.credential) {
    headers.set("authorization", `Bearer ${input.auth.credential}`);
  }

  if (input.auth.authType === "api-key-header" && input.auth.authHeader && input.auth.credential) {
    headers.set(input.auth.authHeader, input.auth.credential);
  }

  return headers;
}

async function readMcpResponse<T>(
  response: Response,
  requestId?: number
): Promise<JsonRpcResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  if (contentType.includes("text/event-stream")) {
    return parseSseResponse<T>(text, requestId);
  }

  try {
    return JSON.parse(text) as JsonRpcResponse<T>;
  } catch {
    if (!response.ok) {
      return {
        error: {
          code: response.status,
          message: text.trim() || `MCP HTTP ${response.status}`
        }
      };
    }

    throw new Error("MCP response was not valid JSON");
  }
}

function parseSseResponse<T>(text: string, requestId?: number): JsonRpcResponse<T> {
  const events = text.split(/\r?\n\r?\n/);

  for (const event of events) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n")
      .trim();

    if (!data) {
      continue;
    }

    const message = JSON.parse(data) as JsonRpcResponse<T>;
    if (requestId === undefined || message.id === requestId) {
      return message;
    }
  }

  throw new Error("MCP SSE response did not include the requested JSON-RPC result");
}
