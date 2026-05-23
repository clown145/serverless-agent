import { describe, expect, it } from "vitest";
import {
  createQqOfficialIntegrationSchema,
  updateQqOfficialIntegrationSchema
} from "../../../src/worker/routes/platforms/qq-official-schemas";

describe("QQ official integration schemas", () => {
  it("defaults optional gateway flags", () => {
    expect(
      createQqOfficialIntegrationSchema.parse({
        appId: "12345",
        secret: "secret"
      })
    ).toMatchObject({
      name: "QQ Official",
      appId: "12345",
      connectionMode: "gateway",
      isSandbox: false,
      enableGroupC2c: true,
      enableGuildDirectMessage: true,
      enablePublicGuildMessages: true
    });
  });

  it("validates updates without requiring a secret", () => {
    expect(
      updateQqOfficialIntegrationSchema.parse({
        connectionMode: "webhook",
        isSandbox: true,
        enableGroupC2c: false
      })
    ).toEqual({
      connectionMode: "webhook",
      isSandbox: true,
      enableGroupC2c: false
    });
  });
});
