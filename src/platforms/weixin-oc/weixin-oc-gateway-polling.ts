import {
  formatWeixinOcApiError,
  isSuccessfulWeixinOcPayload,
  weixinOcApiErrcode
} from "../../adapters/weixin-oc/api";
import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";
import { persistWeixinOcInboundMedia } from "../../adapters/weixin-oc/inbound-media";
import { normalizeWeixinOcInboundMessage } from "../../adapters/weixin-oc/normalize";
import type { WeixinOcAccountState } from "../../adapters/weixin-oc/types";
import type { Env } from "../../shared/types/env";
import type { InternalMessage } from "../../shared/types/internal-message";
import { createWeixinOcGatewayClient } from "./weixin-oc-gateway-client";
import { persistWeixinOcAccountState } from "./weixin-oc-gateway-state";

const SESSION_TIMEOUT_ERRCODE = -14;

export async function pollWeixinOcGatewayUpdates(input: {
  env: Env;
  storage: DurableObjectStorage;
  config: WeixinOcBotConfig;
  clearLoginState: () => Promise<void>;
  dispatchInbound: (agentId: string, message: InternalMessage) => Promise<void>;
}): Promise<void> {
  const client = createWeixinOcGatewayClient(input.config);
  const data = await client.getUpdates(
    input.config.syncBuf,
    input.config.longPollTimeoutMs
  );
  if (!isSuccessfulWeixinOcPayload(data as Record<string, unknown>)) {
    if (weixinOcApiErrcode(data as Record<string, unknown>) === SESSION_TIMEOUT_ERRCODE) {
      await input.clearLoginState();
      return;
    }
    throw new Error(formatWeixinOcApiError(data as Record<string, unknown>));
  }

  const nextState: WeixinOcAccountState = {
    token: input.config.token,
    accountId: input.config.accountId,
    syncBuf: data.get_updates_buf ?? input.config.syncBuf,
    baseUrl: input.config.baseUrl,
    contextTokens: { ...input.config.contextTokens }
  };
  let dirty =
    data.get_updates_buf !== undefined &&
    data.get_updates_buf !== input.config.syncBuf;

  for (const message of data.msgs ?? []) {
    const fromUserId = message.from_user_id?.trim();
    if (!fromUserId) {
      continue;
    }
    const contextToken = message.context_token?.trim();
    if (contextToken && nextState.contextTokens[fromUserId] !== contextToken) {
      nextState.contextTokens[fromUserId] = contextToken;
      dirty = true;
    }
    const normalized = normalizeWeixinOcInboundMessage(message, input.config.agentId);
    if (!normalized) {
      continue;
    }
    await input.dispatchInbound(
      input.config.agentId,
      await persistWeixinOcInboundMedia(input.env, input.config, normalized)
    );
  }

  if (dirty) {
    await persistWeixinOcAccountState(input.storage, input.config, nextState);
  }
}
