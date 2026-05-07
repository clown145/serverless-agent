import { decryptString, encryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import { getMcpServerCredentialRecord } from "../../storage/repositories/mcp-credentials-repository";
import type { McpServerRecord } from "../../storage/repositories/mcp-types";

export type EncryptedMcpCredential = {
  encryptedValue: string;
  iv: string;
  algorithm: string;
};

export async function encryptMcpCredential(
  env: Env,
  plaintext: string
): Promise<EncryptedMcpCredential> {
  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to save MCP keys");
  }

  return encryptString(plaintext, masterKey);
}

export async function resolveMcpCredential(
  env: Env,
  server: McpServerRecord
): Promise<string | undefined> {
  if (!server.credentialId) {
    return undefined;
  }

  const credential = await getMcpServerCredentialRecord(env.AGENT_DB, server.credentialId);
  if (!credential) {
    throw new Error("MCP credential not found");
  }

  const masterKey = resolveCredentialMasterKey(env);
  if (!masterKey) {
    throw new Error("AGENT_MASTER_KEY or INTERNAL_ADMIN_TOKEN is required to read MCP keys");
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
