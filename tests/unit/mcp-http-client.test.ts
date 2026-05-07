import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverMcpHttpTools } from "../../src/tools/mcp/http-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("MCP HTTP client", () => {
  it("initializes a session and lists tools", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string };

      if (body.method === "initialize") {
        return jsonResponse(
          {
            jsonrpc: "2.0",
            id: 1,
            result: {
              protocolVersion: "2025-06-18",
              serverInfo: { name: "Test MCP" }
            }
          },
          {
            "Mcp-Session-Id": "session-1"
          }
        );
      }

      if (body.method === "notifications/initialized") {
        return new Response(null, { status: 202 });
      }

      return jsonResponse({
        jsonrpc: "2.0",
        id: 2,
        result: {
          tools: [
            {
              name: "search",
              description: "Search",
              inputSchema: { type: "object" }
            }
          ]
        }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await discoverMcpHttpTools({
      url: "https://mcp.example.com",
      auth: { authType: "bearer", credential: "secret" }
    });

    expect(result.tools[0]?.name).toBe("search");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestHeaders(fetchMock, 1).get("Mcp-Session-Id")).toBe("session-1");
    expect(requestHeaders(fetchMock, 2).get("authorization")).toBe("Bearer secret");
  });

  it("parses event-stream JSON-RPC results", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string };
      if (body.method === "initialize") {
        return jsonResponse({ jsonrpc: "2.0", id: 1, result: {} });
      }

      if (body.method === "notifications/initialized") {
        return new Response(null, { status: 202 });
      }

      return new Response(
        'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n\n',
        {
          headers: { "content-type": "text/event-stream" }
        }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      discoverMcpHttpTools({
        url: "https://mcp.example.com",
        auth: { authType: "none" }
      })
    ).resolves.toMatchObject({ tools: [] });
  });
});

function jsonResponse(body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

function requestHeaders(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): Headers {
  const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}
