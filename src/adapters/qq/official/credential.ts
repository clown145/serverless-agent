import type { Env } from "../../../shared/types/env";
import { decryptString } from "../../../security/encryption";
import { getPlatformCredentialRecord } from "../../../storage/repositories/platform-credentials-repository";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export async function resolveQqOfficialCredential(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<string | undefined> {
  const credentialId = integration.credentialId;
  if (!credentialId) {
    return undefined;
  }

  const credential = await getPlatformCredentialRecord(env.AGENT_DB, credentialId);
  if (!credential) {
    throw new Error("QQ official credential not found");
  }

  const masterKey = env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read QQ official secrets");
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
