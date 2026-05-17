import { decryptString, encryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import { getPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import type { QqCredential } from "./types";

export type EncryptedQqCredential = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptQqCredential(
  env: Env,
  credential: QqCredential
): Promise<EncryptedQqCredential> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save QQ credentials");
  }

  return encryptString(JSON.stringify(credential), masterKey);
}

export async function resolveQqCredential(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<QqCredential | undefined> {
  if (!integration.credentialId) {
    return undefined;
  }

  const credential = await getPlatformCredentialRecord(env.AGENT_DB, integration.credentialId);
  if (!credential) {
    throw new Error("QQ credential not found");
  }

  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read QQ credentials");
  }

  const plaintext = await decryptString(
    {
      encryptedValue: credential.encryptedValue,
      iv: credential.iv,
      algorithm: "AES-GCM"
    },
    masterKey
  );
  const parsed = JSON.parse(plaintext) as Partial<QqCredential>;
  if (!parsed.appId || !parsed.appSecret) {
    throw new Error("QQ credential is invalid");
  }

  return {
    appId: parsed.appId,
    appSecret: parsed.appSecret
  };
}

function resolveCredentialMasterKey(env: Env): string | undefined {
  return env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
}
