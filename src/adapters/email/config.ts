import { decryptString } from "../../security/encryption";
import type { Env } from "../../shared/types/env";
import { getPlatformCredentialRecord } from "../../storage/repositories/platform-credentials-repository";
import {
  getPlatformIntegrationRecord,
  listPlatformIntegrationRecords
} from "../../storage/repositories/platform-integrations-repository";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";
import type { EmailIntegrationConfig, ResolvedEmailIntegration } from "./types";

export function parseEmailIntegrationConfig(
  integration: PlatformIntegrationRecord
): EmailIntegrationConfig {
  const config = integration.config;
  const fromAddress = stringValue(config.fromAddress) || stringValue(config.emailAddress);
  const inboundAddresses = arrayOfStrings(config.inboundAddresses);
  const fallbackInbound = stringValue(config.inboundAddress) || fromAddress;

  return {
    fromAddress,
    fromName: stringValue(config.fromName),
    replyTo: stringValue(config.replyTo),
    inboundAddresses: inboundAddresses.length
      ? inboundAddresses.map(normalizeEmailAddress)
      : fallbackInbound
        ? [normalizeEmailAddress(fallbackInbound)]
        : []
  };
}

export async function resolveEmailIntegrationByInboundAddress(
  env: Env,
  address: string
): Promise<ResolvedEmailIntegration | undefined> {
  const normalized = normalizeEmailAddress(address);
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, { platform: "email" });

  for (const integration of integrations) {
    const config = parseEmailIntegrationConfig(integration);
    if (config.inboundAddresses.includes(normalized)) {
      return {
        integration,
        config,
        resendApiKey: await requireResendApiKey(env, integration)
      };
    }
  }

  return undefined;
}

export async function resolveEmailIntegrationById(
  env: Env,
  integrationId: string
): Promise<ResolvedEmailIntegration> {
  const integration = await getPlatformIntegrationRecord(env.AGENT_DB, integrationId);
  if (!integration || integration.platform !== "email") {
    throw new Error("Email integration not found");
  }

  return {
    integration,
    config: parseEmailIntegrationConfig(integration),
    resendApiKey: await requireResendApiKey(env, integration)
  };
}

export async function resolveDefaultEmailIntegration(
  env: Env,
  agentId: string
): Promise<ResolvedEmailIntegration> {
  const integrations = await listPlatformIntegrationRecords(env.AGENT_DB, {
    platform: "email",
    agentId
  });
  const integration = integrations[0];
  if (!integration) {
    throw new Error("No email integration is configured for this agent");
  }

  return resolveEmailIntegrationById(env, integration.id);
}

export function formatEmailAddress(input: { address: string; name?: string }): string {
  if (!input.name?.trim()) {
    return input.address;
  }
  const escaped = input.name.replace(/"/g, '\\"');
  return `"${escaped}" <${input.address}>`;
}

export function normalizeEmailAddress(address: string): string {
  return address.trim().toLowerCase();
}

async function requireResendApiKey(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<string> {
  if (!integration.credentialId) {
    throw new Error("Email integration is missing a Resend API key");
  }
  if (!env.AGENT_MASTER_KEY) {
    throw new Error("AGENT_MASTER_KEY is required to decrypt email credentials");
  }

  const credential = await getPlatformCredentialRecord(env.AGENT_DB, integration.credentialId);
  if (!credential) {
    throw new Error("Email credential not found");
  }

  return decryptString(
    {
      encryptedValue: credential.encryptedValue,
      iv: credential.iv,
      algorithm: "AES-GCM"
    },
    env.AGENT_MASTER_KEY
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
