import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";
import {
  DEFAULT_WEIXIN_OC_API_TIMEOUT_MS,
  DEFAULT_WEIXIN_OC_BASE_URL,
  DEFAULT_WEIXIN_OC_BOT_TYPE,
  DEFAULT_WEIXIN_OC_CDN_BASE_URL,
  DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS,
  DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS
} from "../../../adapters/weixin-oc/config";
import { getWeixinOcAccountState, numberConfig, stringConfig } from "../../../adapters/weixin-oc/state";

export type WeixinOcIntegrationDto = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  baseUrl: string;
  cdnBaseUrl: string;
  botType: string;
  qrPollIntervalMs: number;
  longPollTimeoutMs: number;
  apiTimeoutMs: number;
  hasCredential: boolean;
  accountId?: string;
  configured: boolean;
  syncBufLength: number;
  contextTokenCount: number;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export function toWeixinOcIntegrationDto(
  integration: PlatformIntegrationRecord
): WeixinOcIntegrationDto {
  const state = getWeixinOcAccountState(integration.config);
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    status: integration.status,
    baseUrl: state.baseUrl ?? stringConfig(integration.config.baseUrl) ?? DEFAULT_WEIXIN_OC_BASE_URL,
    cdnBaseUrl: stringConfig(integration.config.cdnBaseUrl) ?? DEFAULT_WEIXIN_OC_CDN_BASE_URL,
    botType: stringConfig(integration.config.botType) ?? DEFAULT_WEIXIN_OC_BOT_TYPE,
    qrPollIntervalMs:
      numberConfig(integration.config.qrPollIntervalMs) ?? DEFAULT_WEIXIN_OC_QR_POLL_INTERVAL_MS,
    longPollTimeoutMs:
      numberConfig(integration.config.longPollTimeoutMs) ?? DEFAULT_WEIXIN_OC_LONG_POLL_TIMEOUT_MS,
    apiTimeoutMs:
      numberConfig(integration.config.apiTimeoutMs) ?? DEFAULT_WEIXIN_OC_API_TIMEOUT_MS,
    hasCredential: Boolean(integration.credentialId),
    accountId: state.accountId,
    configured: Boolean(integration.credentialId || state.token),
    syncBufLength: (state.syncBuf ?? "").length,
    contextTokenCount: Object.keys(state.contextTokens).length,
    lastCheckedAt: integration.lastCheckedAt,
    lastError: integration.lastError,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}

