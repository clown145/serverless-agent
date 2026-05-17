import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptQqCredential } from "../../src/adapters/qq/credential";
import { qqMessageTarget, sendQqText } from "../../src/adapters/qq/outbound";
import type { Env } from "../../src/shared/types/env";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("QQ outbound", () => {
  it("maps internal conversation ids to QQ message paths", () => {
    expect(qqMessageTarget("qq:c2c:user")?.path).toBe("/v2/users/user/messages");
    expect(qqMessageTarget("qq:group:group")?.path).toBe("/v2/groups/group/messages");
    expect(qqMessageTarget("qq:channel:channel")?.path).toBe("/channels/channel/messages");
    expect(qqMessageTarget("qq:dm:guild")?.path).toBe("/dms/guild/messages");
    expect(qqMessageTarget("telegram:1")).toBeUndefined();
  });

  it("sends text through QQ OpenAPI", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("getAppAccessToken")) {
        return jsonResponse({ access_token: "token", expires_in: 7200 });
      }
      return jsonResponse({ id: "qq-msg" });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const env = await createEnv();
    const result = await sendQqText(env, "default", "qq:group:g1", "hello");

    expect(result).toMatchObject({ ok: true, providerMessageId: "qq-msg" });
    const sendCall = fetchMock.mock.calls[1] as unknown as [RequestInfo | URL, RequestInit];
    expect(String(sendCall[0])).toBe("https://sandbox.api.sgroup.qq.com/v2/groups/g1/messages");
    expect(JSON.parse(String(sendCall[1].body))).toEqual({ content: "hello", msg_type: 0 });
  });
});

async function createEnv(): Promise<Env> {
  const env = {
    AGENT_DB: createDb() as unknown as D1Database,
    AGENT_KV: createKv() as unknown as KVNamespace,
    INTERNAL_ADMIN_TOKEN: "test-master-key"
  } as unknown as Env;
  const encrypted = await encryptQqCredential(env, { appId: "app", appSecret: "secret" });
  encryptedCredential = encrypted;
  return env;
}

let encryptedCredential: { encryptedValue: string; iv: string; algorithm: string };

function createDb() {
  return {
    prepare(sql: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async first() {
          if (sql.includes("platform_integrations")) {
            return {
              id: "pint-1",
              agent_id: "default",
              platform: "qq",
              name: "QQ",
              credential_id: "pcred-1",
              config_json: JSON.stringify({ environment: "sandbox" }),
              webhook_secret: "secret",
              status: "active",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z"
            };
          }
          if (sql.includes("platform_credentials")) {
            return {
              id: "pcred-1",
              integration_id: "pint-1",
              encrypted_value: encryptedCredential.encryptedValue,
              iv: encryptedCredential.iv,
              algorithm: encryptedCredential.algorithm,
              status: "active",
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z"
            };
          }
          return null;
        }
      };
      return statement;
    }
  };
}

function createKv() {
  return {
    async get() {
      return undefined;
    },
    async put() {}
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" }
  });
}
