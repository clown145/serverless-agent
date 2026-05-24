import type { Env } from "../../shared/types/env";
import { getModelCredentialRecord } from "../../storage/repositories/model-credentials-repository";
import type { ModelProviderRecord } from "../../storage/repositories/model-settings-types";
import { decryptString, encryptString } from "../../security/encryption";

export type EncryptedProviderCredential = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptProviderCredential(
  env: Env,
  plaintext: string
): Promise<EncryptedProviderCredential> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save provider keys");
  }

  return encryptString(plaintext, masterKey);
}

export async function resolveProviderApiKey(
  env: Env,
  provider: ModelProviderRecord
): Promise<string | undefined> {
  if (provider.credentialId) {
    const credential = await getModelCredentialRecord(env.AGENT_DB, provider.credentialId);
    if (!credential) {
      throw new Error("Provider credential not found");
    }

    const masterKey = resolveCredentialMasterKey(env);
    if (!masterKey) {
      throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read provider keys");
    }

    try {
      return await decryptString(
        {
          encryptedValue: credential.encryptedValue,
          iv: credential.iv,
          algorithm: "AES-GCM"
        },
        masterKey
      );
    } catch (error) {
      const fallback = readLegacyProviderSecret(env, provider);
      if (fallback) {
        return fallback;
      }

      throw new Error(
        "Provider API key could not be decrypted. Restore the AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN used when it was saved, or re-save this provider API key in the WebUI.",
        { cause: error }
      );
    }
  }

  return readLegacyProviderSecret(env, provider);
}

function resolveCredentialMasterKey(env: Env): string | undefined {
  return env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
}

function readLegacyProviderSecret(env: Env, provider: ModelProviderRecord): string | undefined {
  const secretName = provider.apiKeySecret || legacySecretName(provider.providerType);
  return (env as unknown as Record<string, string | undefined>)[secretName];
}

function legacySecretName(type: string): string {
  if (type === "openai") {
    return "OPENAI_API_KEY";
  }

  if (type === "gemini") {
    return "GEMINI_API_KEY";
  }

  return "MODEL_API_KEY";
}
