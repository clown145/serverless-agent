import {
  resolveWeixinOcBotByIntegrationId,
  resolveWeixinOcBotForAgent,
  type WeixinOcBotConfig
} from "../../adapters/weixin-oc/config";
import { normalizeContextTokens } from "../../adapters/weixin-oc/state";
import type { WeixinOcAccountState, WeixinOcLoginSession } from "../../adapters/weixin-oc/types";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";

const LOGIN_SESSION_TTL_MS = 5 * 60 * 1000;

export const WEIXIN_OC_LOGIN_SESSION_KEY = "login_session";
export const WEIXIN_OC_ACCOUNT_STATE_KEY = "account_state";
export const WEIXIN_OC_RUNTIME_STATUS_KEY = "runtime_status";
export const WEIXIN_OC_AGENT_ID_KEY = "agent_id";
export const WEIXIN_OC_INTEGRATION_ID_KEY = "integration_id";
export const WEIXIN_OC_QR_EXPIRED_COUNT_KEY = "qr_expired_count";

export type WeixinOcRuntimeStatus = {
  lastError?: string;
  updatedAt: string;
};

export function isWeixinOcLoginSessionValid(
  loginSession: WeixinOcLoginSession | undefined
): loginSession is WeixinOcLoginSession {
  if (!loginSession) {
    return false;
  }
  return Date.now() - new Date(loginSession.startedAt).getTime() < LOGIN_SESSION_TTL_MS;
}

export async function rememberWeixinOcGatewayTarget(
  storage: DurableObjectStorage,
  agentId: string,
  integrationId: string
): Promise<void> {
  await storage.put(WEIXIN_OC_AGENT_ID_KEY, agentId);
  await storage.put(WEIXIN_OC_INTEGRATION_ID_KEY, integrationId);
}

export async function resolveWeixinOcGatewayTarget(
  storage: DurableObjectStorage,
  defaultAgentId: string
): Promise<{ agentId: string; integrationId?: string }> {
  return {
    agentId: (await storage.get<string>(WEIXIN_OC_AGENT_ID_KEY)) ?? defaultAgentId,
    integrationId: await storage.get<string>(WEIXIN_OC_INTEGRATION_ID_KEY)
  };
}

export async function clearWeixinOcLoginSession(
  storage: DurableObjectStorage
): Promise<void> {
  await storage.delete(WEIXIN_OC_LOGIN_SESSION_KEY);
  await storage.delete(WEIXIN_OC_QR_EXPIRED_COUNT_KEY);
}

export async function requireWeixinOcGatewayConfig(
  env: Env,
  storage: DurableObjectStorage,
  agentId: string,
  integrationId?: string
): Promise<WeixinOcBotConfig> {
  const config = integrationId
    ? await resolveWeixinOcBotByIntegrationId(env, integrationId)
    : await resolveWeixinOcBotForAgent(env, agentId);
  if (!config) {
    throw new Error("Weixin OC integration is not configured");
  }

  return withRuntimeAccountState(storage, config);
}

export async function persistWeixinOcAccountState(
  storage: DurableObjectStorage,
  config: WeixinOcBotConfig,
  state: Partial<WeixinOcAccountState>
): Promise<void> {
  const current = await getStoredWeixinOcAccountState(storage, config);
  await storage.put(
    WEIXIN_OC_ACCOUNT_STATE_KEY,
    normalizeRuntimeAccountState({
      ...current,
      ...state,
      token: undefined
    })
  );
  await clearWeixinOcRuntimeError(storage);
}

export async function getStoredWeixinOcAccountState(
  storage: DurableObjectStorage,
  config: WeixinOcBotConfig
): Promise<WeixinOcAccountState> {
  const stored = await storage.get<Partial<WeixinOcAccountState>>(
    WEIXIN_OC_ACCOUNT_STATE_KEY
  );
  if (stored) {
    return normalizeRuntimeAccountState(stored);
  }

  const legacyState = normalizeRuntimeAccountState({
    accountId: config.accountId,
    syncBuf: config.syncBuf,
    baseUrl: config.baseUrl,
    contextTokens: config.contextTokens
  });
  if (hasRuntimeAccountState(legacyState)) {
    await storage.put(WEIXIN_OC_ACCOUNT_STATE_KEY, legacyState);
  }
  return legacyState;
}

export async function recordWeixinOcRuntimeError(
  storage: DurableObjectStorage,
  message: string
): Promise<void> {
  await storage.put(WEIXIN_OC_RUNTIME_STATUS_KEY, {
    lastError: message,
    updatedAt: nowIso()
  } satisfies WeixinOcRuntimeStatus);
}

export async function clearWeixinOcRuntimeError(
  storage: DurableObjectStorage
): Promise<void> {
  await storage.delete(WEIXIN_OC_RUNTIME_STATUS_KEY);
}

async function withRuntimeAccountState(
  storage: DurableObjectStorage,
  config: WeixinOcBotConfig
): Promise<WeixinOcBotConfig> {
  const accountState = await getStoredWeixinOcAccountState(storage, config);
  return {
    ...config,
    accountId: accountState.accountId ?? config.accountId,
    syncBuf: accountState.syncBuf ?? config.syncBuf,
    baseUrl: accountState.baseUrl ?? config.baseUrl,
    contextTokens: {
      ...config.contextTokens,
      ...accountState.contextTokens
    }
  };
}

function normalizeRuntimeAccountState(
  state: Partial<WeixinOcAccountState>
): WeixinOcAccountState {
  return {
    accountId: stringFromUnknown(state.accountId),
    syncBuf: stringFromUnknown(state.syncBuf) ?? "",
    baseUrl: stringFromUnknown(state.baseUrl),
    contextTokens: normalizeContextTokens(state.contextTokens)
  };
}

function stringFromUnknown(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasRuntimeAccountState(state: WeixinOcAccountState): boolean {
  return Boolean(
    state.accountId ||
      state.syncBuf ||
      state.baseUrl ||
      Object.keys(state.contextTokens).length > 0
  );
}
