import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/shared/types/env";

const mocks = vi.hoisted(() => ({
  connectConfiguredQqOfficialGateways: vi.fn()
}));

vi.mock("../../src/adapters/qq/official/keepalive", () => ({
  connectConfiguredQqOfficialGateways: mocks.connectConfiguredQqOfficialGateways
}));

const { routeRequest } = await import("../../src/worker/router");

describe("router admin auth", () => {
  beforeEach(() => {
    mocks.connectConfiguredQqOfficialGateways.mockReset();
  });

  it("requires admin auth before dispatching any admin path", async () => {
    const response = await routeRequest(
      new Request("https://agent.local/admin/not-a-route"),
      createEnv(),
      createExecutionContext()
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "unauthorized" }
    });
  });

  it("protects QQ official admin routes that do not call requireAdmin directly", async () => {
    const response = await routeRequest(
      new Request("https://agent.local/admin/platforms/qq-official/connect-all", {
        method: "POST"
      }),
      createEnv(),
      createExecutionContext()
    );

    expect(response.status).toBe(401);
    expect(mocks.connectConfiguredQqOfficialGateways).not.toHaveBeenCalled();
  });

  it("allows authorized admin requests through to the route handler", async () => {
    mocks.connectConfiguredQqOfficialGateways.mockResolvedValue([{ agentId: "default", ok: true }]);

    const env = createEnv();
    const response = await routeRequest(
      new Request("https://agent.local/admin/platforms/qq-official/connect-all", {
        method: "POST",
        headers: { authorization: "Bearer test-token" }
      }),
      env,
      createExecutionContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [{ agentId: "default", ok: true }]
    });
    expect(mocks.connectConfiguredQqOfficialGateways).toHaveBeenCalledWith(env);
  });

  it("does not require admin auth for public health checks", async () => {
    const response = await routeRequest(
      new Request("https://agent.local/health"),
      createEnv(),
      createExecutionContext()
    );

    expect(response.status).toBe(200);
  });

  it("keeps the WebUI shell accessible while protecting the admin API it uses", async () => {
    const response = await routeRequest(
      new Request("https://agent.local/ui"),
      {
        ...createEnv(),
        ASSETS: {
          fetch: vi.fn().mockResolvedValue(new Response("<html></html>", { status: 200 }))
        }
      } as unknown as Env,
      createExecutionContext()
    );

    expect(response.status).toBe(200);
  });
});

function createEnv(): Env {
  return {
    INTERNAL_ADMIN_TOKEN: "test-token"
  } as unknown as Env;
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil() {},
    passThroughOnException() {}
  } as unknown as ExecutionContext;
}
