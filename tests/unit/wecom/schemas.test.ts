import { describe, expect, it } from "vitest";
import {
  createWecomIntegrationSchema,
  updateWecomIntegrationSchema
} from "../../../src/worker/routes/platforms/wecom-schemas";

describe("WeCom integration schemas", () => {
  it("defaults optional fields", () => {
    expect(
      createWecomIntegrationSchema.parse({
        corpId: "ww123",
        secret: "secret"
      })
    ).toMatchObject({
      name: "WeCom Customer Service",
      corpId: "ww123",
      apiBaseUrl: "https://qyapi.weixin.qq.com/cgi-bin/"
    });
  });

  it("validates updates without requiring a secret", () => {
    expect(
      updateWecomIntegrationSchema.parse({
        openKfId: "wkf_123",
        customerServiceName: "Support"
      })
    ).toEqual({
      openKfId: "wkf_123",
      customerServiceName: "Support"
    });
  });
});
