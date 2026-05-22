import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpTools } from "../../src/tools/http/tools";
import type { ToolExecutionContext } from "../../src/tools/types";

const originalFetch = globalThis.fetch;

type HttpToolTestEnv = {
  AGENT_DB: D1Database;
  AGENT_BUCKET: R2Bucket;
  AGENT_MASTER_KEY: string;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("http.request", () => {
  it("sends JSON requests and returns parsed JSON responses", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("content-type")).toBe("application/json");
      expect(headers.get("x-test")).toBe("yes");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ hello: "world" }));

      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "x-secret": "hidden"
        }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeHttpRequest({
      url: "https://api.example.com/items",
      method: "POST",
      headers: { "x-test": "yes" },
      query: { page: "1" },
      bodyType: "json",
      json: { hello: "world" }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/items?page=1",
      expect.objectContaining({
        method: "POST",
        redirect: "manual"
      })
    );
    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      status: 201,
      ok: true,
      bodyText: "{\"ok\":true}",
      bodyJson: { ok: true },
      headers: {
        "content-type": "application/json"
      }
    });
    expect((result.output as { headers: Record<string, string> }).headers).not.toHaveProperty(
      "x-secret"
    );
  });

  it("builds multipart requests from files and fields", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.headers).toBeInstanceOf(Headers);
      expect((init?.body as FormData).get("album")).toBe("avatars");
      const file = (init?.body as FormData).get("image");
      expect(file).toBeInstanceOf(Blob);
      expect((file as unknown as Blob).type).toBe("image/png");
      return new Response(JSON.stringify({ uploaded: true }), {
        headers: { "content-type": "application/json" }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeHttpRequest({
      url: "https://upload.example.com/api",
      method: "POST",
      bodyType: "multipart",
      multipart: [
        { kind: "field", name: "album", value: "avatars" },
        {
          kind: "file",
          name: "image",
          source: {
            type: "base64",
            dataBase64: btoa("image-bytes")
          },
          fileName: "avatar.png",
          mimeType: "image/png"
        }
      ]
    });

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stores and sends cookies according to jar mode", async () => {
    const env = createToolEnv();
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (fetchMock.mock.calls.length === 1) {
        expect(headers.get("cookie")).toBeNull();
        return new Response("ok", {
          headers: {
            "set-cookie": "sid=abc; Path=/; HttpOnly"
          }
        });
      }

      expect(headers.get("cookie")).toBe("sid=abc");
      return new Response("ok");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const stored = await executeHttpRequest(
      {
        url: "https://api.example.com/login",
        method: "POST",
        bodyType: "form",
        form: { user: "alice" },
        cookieJar: {
          id: "example",
          mode: "store"
        }
      },
      env
    );
    const sent = await executeHttpRequest(
      {
        url: "https://api.example.com/me",
        cookieJar: {
          id: "example",
          mode: "send"
        }
      },
      env
    );

    expect(stored.status).toBe("success");
    expect(sent.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects private network URLs before fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeHttpRequest({
      url: "http://192.168.1.10/admin"
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "invalid_url"
      }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks redirects to private network URLs", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("", {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await executeHttpRequest({
      url: "https://api.example.com/redirect"
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "http_request_failed",
        message: expect.stringContaining("Redirect blocked")
      }
    });
  });
});

function executeHttpRequest(input: unknown, env = createToolEnv()) {
  const tool = createHttpTools()[0];
  return tool.execute({
    env: env as ToolExecutionContext["env"],
    agentId: "default",
    actorId: "tester",
    runId: "run",
    stepId: "step",
    input
  } as ToolExecutionContext);
}

function createToolEnv(): HttpToolTestEnv {
  return {
    AGENT_DB: createD1Mock(),
    AGENT_BUCKET: {} as R2Bucket,
    AGENT_MASTER_KEY: "test-master"
  };
}

function createD1Mock(): D1Database {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (sql.includes("http_cookie_jars")) {
            return rows.get(`${values[0]}:${values[1]}`) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("http_cookie_jars")) {
            rows.set(`${values[0]}:${values[1]}`, {
              agent_id: values[0],
              jar_id: values[1],
              encrypted_value: values[2],
              iv: values[3],
              algorithm: values[4],
              created_at: values[5],
              updated_at: values[6]
            });
          }
          return { success: true } as D1Result;
        }
      })
    })
  } as D1Database;
}
