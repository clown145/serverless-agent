import { decryptString, encryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import { getSearchProviderCredentialRecord } from "../../storage/repositories/search-credentials-repository";
import type { SearchProviderRecord } from "../../storage/repositories/search-types";

export type EncryptedSearchCredential = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptSearchCredential(
  env: Env,
  plaintext: string
): Promise<EncryptedSearchCredential> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save search keys");
  }

  return encryptString(plaintext, masterKey);
}

export async function resolveSearchCredential(
  env: Env,
  provider: SearchProviderRecord
): Promise<string | undefined> {
  if (provider.credentialId) {
    const credential = await getSearchProviderCredentialRecord(env.AGENT_DB, provider.credentialId);
    if (!credential) {
      throw new Error("Search provider credential not found");
    }

    const masterKey = resolveCredentialMasterKey(env);
    if (!masterKey) {
      throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read search keys");
    }

    return decryptString(
      {
        encryptedValue: credential.encryptedValue,
        iv: credential.iv,
        algorithm: "AES-GCM"
      },
      masterKey
    );
  }

  return provider.providerType === "tavily" ? env.TAVILY_API_KEY : undefined;
}

function resolveCredentialMasterKey(env: Env): string | undefined {
  return env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
}
