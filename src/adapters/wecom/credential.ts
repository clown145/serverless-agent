import { decryptString, encryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import { getPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";

export type EncryptedWecomCredential = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptWecomSecret(
  env: Env,
  plaintext: string
): Promise<EncryptedWecomCredential> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save WeCom secrets");
  }

  return encryptString(plaintext, masterKey);
}

export async function resolveWecomCredential(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<string | undefined> {
  if (!integration.credentialId) {
    return undefined;
  }

  const credential = await getPlatformCredentialRecord(env.AGENT_DB, integration.credentialId);
  if (!credential) {
    throw new Error("WeCom credential not found");
  }

  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read WeCom secrets");
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

function resolveCredentialMasterKey(env: Env): string | undefined {
  return env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
}
