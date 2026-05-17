import { describe, expect, it } from "vitest";
import {
  createQqIntegrationSchema,
  updateQqIntegrationSchema
} from "../../src/worker/routes/platforms/qq-schemas";

describe("QQ schemas", () => {
  it("defaults QQ integration fields", () => {
    expect(createQqIntegrationSchema.parse({ appId: "app", appSecret: "secret" })).toMatchObject({
      name: "QQ",
      environment: "sandbox"
    });
  });

  it("validates environment updates", () => {
    expect(updateQqIntegrationSchema.parse({ environment: "production" })).toEqual({
      environment: "production"
    });
    expect(() => updateQqIntegrationSchema.parse({ environment: "dev" })).toThrow();
  });
});
