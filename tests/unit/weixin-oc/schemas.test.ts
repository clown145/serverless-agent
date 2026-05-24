import { describe, expect, it } from "vitest";
import {
  createWeixinOcIntegrationSchema,
  updateWeixinOcIntegrationSchema
} from "../../../src/worker/routes/platforms/weixin-oc-schemas";

describe("Weixin OC integration schemas", () => {
  it("defaults optional transport fields", () => {
    expect(createWeixinOcIntegrationSchema.parse({})).toMatchObject({
      name: "WeChat Personal",
      baseUrl: "https://ilinkai.weixin.qq.com",
      cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
      botType: "3",
      qrPollIntervalMs: 1000,
      longPollTimeoutMs: 35000,
      apiTimeoutMs: 15000
    });
  });

  it("validates updates without requiring token", () => {
    expect(
      updateWeixinOcIntegrationSchema.parse({
        baseUrl: "https://example.com",
        qrPollIntervalMs: 2000
      })
    ).toEqual({
      baseUrl: "https://example.com",
      qrPollIntervalMs: 2000
    });
  });
});
