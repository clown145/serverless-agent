import { describe, expect, it } from "vitest";
import { encryptString } from "../../src/security/encryption";
import { resolveProviderApiKey } from "../../src/core/model/provider-credential";
import type { Env } from "../../src/shared/types/env";
import type { ModelProviderRecord } from "../../src/storage/repositories/model-settings-types";

describe("provider credentials", () => {
  it("falls back to the configured provider secret when saved credential decryption fails", async () => {
    const encrypted = await encryptString("old-key", "old-master");
    const env = {
      AGENT_MASTER_KEY: "new-master",
      OPENAI_API_KEY: "env-key",
      AGENT_DB: credentialDb({
        encrypted_value: encrypted.encryptedValue,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm
      })
    } as unknown as Env;

    await expect(resolveProviderApiKey(env, providerRecord())).resolves.toBe("env-key");
  });

  it("returns an actionable error when saved credential cannot be decrypted", async () => {
    const encrypted = await encryptString("old-key", "old-master");
    const env = {
      AGENT_MASTER_KEY: "new-master",
      AGENT_DB: credentialDb({
        encrypted_value: encrypted.encryptedValue,
        iv: encrypted.iv,
        algorithm: encrypted.algorithm
      })
    } as unknown as Env;

    await expect(resolveProviderApiKey(env, providerRecord())).rejects.toThrow(
      "Provider API key could not be decrypted"
    );
  });
});

function credentialDb(row: {
  encrypted_value: string;
  iv: string;
  algorithm: string;
}): Pick<D1Database, "prepare"> {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => ({
          id: "mcred-1",
          provider_id: "provider-1",
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          ...row
        })
      })
    })
  } as unknown as Pick<D1Database, "prepare">;
}

function providerRecord(): ModelProviderRecord {
  return {
    id: "provider-1",
    name: "OpenAI",
    providerType: "openai",
    credentialId: "mcred-1",
    authType: "bearer",
    modelListStrategy: "openai",
    chatProtocol: "openai-chat-completions",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}
