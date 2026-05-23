import { describe, expect, it } from "vitest";
import {
  createQqOfficialWebhookValidationResponse,
  signQqOfficialWebhookValidation
} from "../../../src/adapters/qq/official/webhook-validation";

describe("QQ official webhook validation", () => {
  it("signs validation payloads with the repeated secret seed", async () => {
    await expect(signQqOfficialWebhookValidation("secret", "123plain")).resolves.toBe(
      "384a430963b14721a41e784094774cb4d5c062527847711388b12cc726918e8cab8adfcae20ef46d4698c630d5a7be82de7241349fa027210752b46371d40f0e"
    );
  });

  it("returns the QQ validation response shape", async () => {
    await expect(
      createQqOfficialWebhookValidationResponse("secret", {
        event_ts: "123",
        plain_token: "plain"
      })
    ).resolves.toMatchObject({
      plain_token: "plain",
      signature: expect.any(String)
    });
  });
});
