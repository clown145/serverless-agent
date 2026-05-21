import type { WeixinOcAccountState } from "./types";

export function getWeixinOcAccountState(
  config: Record<string, unknown>
): WeixinOcAccountState {
  return {
    token: stringConfig(config.token),
    accountId: stringConfig(config.accountId),
    syncBuf: stringConfig(config.syncBuf) ?? "",
    baseUrl: stringConfig(config.baseUrl),
    contextTokens: normalizeContextTokens(config.contextTokens)
  };
}

export function withWeixinOcAccountState(
  config: Record<string, unknown>,
  state: Partial<WeixinOcAccountState>
): Record<string, unknown> {
  return {
    ...config,
    token: state.token ?? "",
    accountId: state.accountId ?? "",
    syncBuf: state.syncBuf ?? "",
    baseUrl: state.baseUrl ?? stringConfig(config.baseUrl) ?? "",
    contextTokens: normalizeContextTokens(state.contextTokens ?? {})
  };
}

export function normalizeContextTokens(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [userId, contextToken] of Object.entries(value)) {
    if (typeof contextToken !== "string") {
      continue;
    }
    const cleanUserId = userId.trim();
    const cleanContextToken = contextToken.trim();
    if (cleanUserId && cleanContextToken) {
      normalized[cleanUserId] = cleanContextToken;
    }
  }
  return normalized;
}

export function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function numberConfig(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

