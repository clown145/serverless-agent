import { decryptString, encryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import {
  createPlatformCredentialRecord,
  getPlatformCredentialRecord
} from "../../storage/repositories/platform-credentials-repository";
import { updatePlatformIntegrationCredential } from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";

export type EncryptedWeixinOcToken = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptWeixinOcToken(
  env: Env,
  plaintext: string
): Promise<EncryptedWeixinOcToken> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save Weixin OC tokens");
  }

  return encryptString(plaintext, masterKey);
}

export async function resolveWeixinOcCredential(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<string | undefined> {
  if (!integration.credentialId) {
    return undefined;
  }

  const credential = await getPlatformCredentialRecord(env.AGENT_DB, integration.credentialId);
  if (!credential) {
    throw new Error("Weixin OC credential not found");
  }

  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read Weixin OC tokens");
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

export async function saveWeixinOcTokenCredential(
  env: Env,
  integrationId: string,
  token: string
): Promise<PlatformIntegrationRecord> {
  const encrypted = await encryptWeixinOcToken(env, token);
  const credential = await createPlatformCredentialRecord(env.AGENT_DB, {
    integrationId,
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    algorithm: encrypted.algorithm
  });
  const updated = await updatePlatformIntegrationCredential(
    env.AGENT_DB,
    integrationId,
    credential.id
  );

  if (!updated) {
    throw new Error("Weixin OC integration not found after credential save");
  }

  return updated;
}

function resolveCredentialMasterKey(env: Env): string | undefined {
  return env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
}
