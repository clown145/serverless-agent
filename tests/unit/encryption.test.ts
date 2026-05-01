import { describe, expect, it } from "vitest";
import { decryptString, encryptString } from "../../src/security/encryption";

describe("encryption", () => {
  it("round trips strings with a master key", async () => {
    const encrypted = await encryptString("secret-value", "master-key");

    expect(encrypted.encryptedValue).not.toBe("secret-value");
    await expect(decryptString(encrypted, "master-key")).resolves.toBe("secret-value");
  });
});
