import { encryptString } from "../../../security/encryption";
import type { Env } from "../../../shared/types/env";

export type EncryptedQqOfficialSecret = {
  encryptedValue: string;
  iv: string;
  algorithm: "AES-GCM";
};

export async function encryptQqOfficialSecret(
  env: Env,
  plaintext: string
): Promise<EncryptedQqOfficialSecret> {
  const masterKey = env.AGENT_MASTER_KEY ?? env.INTERNAL_ADMIN_TOKEN;
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save QQ official secrets");
  }

  return encryptString(plaintext, masterKey);
}
