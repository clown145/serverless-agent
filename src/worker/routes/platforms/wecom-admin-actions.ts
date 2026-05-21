import { WecomApiClient } from "../../../adapters/wecom/api";
import {
  buildQrCodeUrl,
  contactSceneForIntegration
} from "../../../adapters/wecom/contact";
import { integrationWecomConfig, stringConfig } from "../../../adapters/wecom/config";
import {
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck,
  updatePlatformIntegrationConfig
} from "../../../storage/repositories/platform-integrations-repository";
import { errorResponse, jsonResponse } from "../../../shared/http";
import type { Env } from "../../../shared/types/env";
import { toWecomIntegrationDto } from "./wecom-dto";

type WecomIntegration = NonNullable<
  Awaited<ReturnType<typeof getPlatformIntegrationRecord>>
>;

export async function testWecomIntegration(
  env: Env,
  integration: WecomIntegration
): Promise<Response> {
  const client = await createClient(env, integration);
  if (!client) {
    return errorResponse(400, "wecom_secret_missing", "WeCom corp id or secret is missing");
  }

  try {
    const accounts = await client.listKfAccounts();
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});
    return jsonResponse({
      ok: true,
      integration: toWecomIntegrationDto(integration),
      accounts
    });
  } catch (error) {
    return recordWecomActionError(env, integration.id, "wecom_test_failed", error);
  }
}

export async function createWecomContactWay(
  request: Request,
  env: Env,
  integration: WecomIntegration
): Promise<Response> {
  const client = await createClient(env, integration);
  if (!client) {
    return errorResponse(400, "wecom_secret_missing", "WeCom corp id or secret is missing");
  }

  try {
    const config = await integrationWecomConfig(env, integration);
    const openKfId = config.openKfId ?? await resolveOpenKfId(client, config.customerServiceName);
    if (!openKfId) {
      return errorResponse(
        400,
        "wecom_kf_missing",
        "Configure openKfId or customerServiceName before creating a contact URL"
      );
    }

    const contact = await client.addKfContactWay(
      openKfId,
      contactSceneForIntegration(integration.id)
    );
    if (!contact.url) {
      return errorResponse(502, "wecom_contact_url_missing", "WeCom did not return a contact URL");
    }

    const updated = await updatePlatformIntegrationConfig(env.AGENT_DB, integration.id, {
      ...integration.config,
      openKfId,
      contactUrl: contact.url
    });
    await updatePlatformIntegrationCheck(env.AGENT_DB, integration.id, {});

    const responseIntegration = updated ?? integration;
    return jsonResponse({
      ok: true,
      integration: toWecomIntegrationDto(responseIntegration),
      contactUrl: contact.url,
      qrCodeUrl: buildAbsoluteQrCodeUrl(request, contact.url),
      contact
    });
  } catch (error) {
    return recordWecomActionError(env, integration.id, "wecom_contact_way_failed", error);
  }
}

async function createClient(
  env: Env,
  integration: WecomIntegration
): Promise<WecomApiClient | undefined> {
  const config = await integrationWecomConfig(env, integration);
  if (!config.corpId || !config.secret) {
    return undefined;
  }

  return new WecomApiClient({
    corpId: config.corpId,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl
  });
}

async function resolveOpenKfId(
  client: WecomApiClient,
  customerServiceName?: string
): Promise<string | undefined> {
  const accounts = await client.listKfAccounts();
  if (!customerServiceName) {
    return accounts.account_list?.[0]?.open_kfid;
  }

  return accounts.account_list?.find((account) => account.name === customerServiceName)?.open_kfid;
}

async function recordWecomActionError(
  env: Env,
  integrationId: string,
  code: string,
  error: unknown
): Promise<Response> {
  const message = error instanceof Error ? error.message : "WeCom action failed";
  await updatePlatformIntegrationCheck(env.AGENT_DB, integrationId, {
    lastError: message
  });
  return errorResponse(502, code, message);
}

function buildAbsoluteQrCodeUrl(request: Request, contactUrl: string): string {
  const qr = buildQrCodeUrl(contactUrl);
  if (qr.startsWith("http")) {
    return qr;
  }
  return new URL(qr, request.url).toString();
}

export function withoutWecomSecret(input: {
  secret?: string;
  [key: string]: unknown;
}): Record<string, unknown> {
  const { secret: _secret, ...config } = input;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      const trimmed = stringConfig(value);
      if (trimmed) {
        clean[key] = trimmed;
      }
    } else if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}
