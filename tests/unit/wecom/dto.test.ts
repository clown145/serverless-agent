import { describe, expect, it } from "vitest";
import { mapPlatformIntegrationRow } from "../../../src/storage/repositories/platform-integration-types";
import { toWecomIntegrationDto } from "../../../src/worker/routes/platforms/wecom-dto";

describe("WeCom integration DTO", () => {
  it("maps customer service config and contact URLs", () => {
    const integration = mapPlatformIntegrationRow({
      id: "pint-wecom",
      agent_id: "default",
      platform: "wecom",
      name: "WeCom",
      credential_id: "pcred-wecom",
      config_json: JSON.stringify({
        corpId: "ww123",
        token: "token",
        encodingAesKey: "aes",
        openKfId: "wkf_123",
        contactUrl: "https://work.weixin.qq.com/kfid/kfc123"
      }),
      webhook_secret: "secret",
      status: "active",
      last_checked_at: null,
      last_error: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    expect(toWecomIntegrationDto(integration)).toMatchObject({
      corpId: "ww123",
      openKfId: "wkf_123",
      hasSecret: true,
      tokenConfigured: true,
      encodingAesKeyConfigured: true,
      webhookPath: "/webhooks/wecom/secret",
      contactUrl: "https://work.weixin.qq.com/kfid/kfc123",
      qrCodeUrl: expect.stringContaining("api.cl2wm.cn")
    });
  });

  it("normalizes API base to cgi-bin", () => {
    const integration = mapPlatformIntegrationRow({
      id: "pint-wecom",
      agent_id: "default",
      platform: "wecom",
      name: "WeCom",
      credential_id: null,
      config_json: JSON.stringify({
        corpId: "ww123",
        apiBaseUrl: "https://qyapi.weixin.qq.com"
      }),
      webhook_secret: null,
      status: "active",
      last_checked_at: null,
      last_error: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    expect(toWecomIntegrationDto(integration).apiBaseUrl).toBe(
      "https://qyapi.weixin.qq.com/cgi-bin/"
    );
  });
});
