import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";
import { saveWeixinOcTokenCredential } from "../../adapters/weixin-oc/credential";
import type { WeixinOcLoginSession } from "../../adapters/weixin-oc/types";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import { updatePlatformIntegrationCheck } from "../../storage/repositories/platform-integrations-repository";
import { createWeixinOcGatewayClient } from "./weixin-oc-gateway-client";
import {
  clearWeixinOcRuntimeError,
  isWeixinOcLoginSessionValid,
  persistWeixinOcAccountState,
  WEIXIN_OC_LOGIN_SESSION_KEY,
  WEIXIN_OC_QR_EXPIRED_COUNT_KEY
} from "./weixin-oc-gateway-state";

export async function startWeixinOcGatewayLogin<TStatus>(input: {
  env: Env;
  storage: DurableObjectStorage;
  config: WeixinOcBotConfig;
  forceRefresh: boolean;
  schedulePoll: (delayMs: number) => Promise<void>;
  status: () => Promise<TStatus>;
}): Promise<TStatus> {
  const existing = await input.storage.get<WeixinOcLoginSession>(WEIXIN_OC_LOGIN_SESSION_KEY);
  if (!input.forceRefresh && isWeixinOcLoginSessionValid(existing)) {
    await input.schedulePoll(input.config.qrPollIntervalMs);
    return input.status();
  }

  const client = createWeixinOcGatewayClient(input.config);
  const payload = await client.getLoginQrCode(input.config.botType);
  const qrcode = String(payload.qrcode ?? "").trim();
  const qrcodeImgContent = String(payload.qrcode_img_content ?? "").trim();
  if (!qrcode || !qrcodeImgContent) {
    throw new Error("Weixin OC QR response is missing qrcode or qrcode_img_content");
  }

  const loginSession: WeixinOcLoginSession = {
    sessionKey: crypto.randomUUID(),
    qrcode,
    qrcodeImgContent,
    startedAt: nowIso(),
    status: "wait"
  };
  await input.storage.put(WEIXIN_OC_LOGIN_SESSION_KEY, loginSession);
  await input.storage.put(WEIXIN_OC_QR_EXPIRED_COUNT_KEY, 0);
  await updatePlatformIntegrationCheck(input.env.AGENT_DB, input.config.integrationId, {});
  await clearWeixinOcRuntimeError(input.storage);
  await input.schedulePoll(input.config.qrPollIntervalMs);
  return input.status();
}

export async function pollWeixinOcGatewayLogin(input: {
  env: Env;
  storage: DurableObjectStorage;
  config: WeixinOcBotConfig;
  restartLogin: () => Promise<unknown>;
  schedulePoll: (delayMs: number) => Promise<void>;
}): Promise<boolean> {
  const loginSession = await input.storage.get<WeixinOcLoginSession>(WEIXIN_OC_LOGIN_SESSION_KEY);
  if (!isWeixinOcLoginSessionValid(loginSession)) {
    await input.restartLogin();
    return false;
  }

  const client = createWeixinOcGatewayClient(input.config);
  const data = await client.getQrCodeStatus(loginSession.qrcode, input.config.longPollTimeoutMs);
  const status = String(data.status ?? "wait").trim();
  const nextSession: WeixinOcLoginSession = {
    ...loginSession,
    status
  };

  if (status === "expired") {
    const expiredCount =
      ((await input.storage.get<number>(WEIXIN_OC_QR_EXPIRED_COUNT_KEY)) ?? 0) + 1;
    await input.storage.put(WEIXIN_OC_QR_EXPIRED_COUNT_KEY, expiredCount);
    if (expiredCount > 3) {
      await input.storage.put(WEIXIN_OC_LOGIN_SESSION_KEY, {
        ...nextSession,
        error: "QR code expired. Start QR login again."
      });
      return false;
    }
    await input.restartLogin();
    return false;
  }

  if (status !== "confirmed") {
    await input.storage.put(WEIXIN_OC_LOGIN_SESSION_KEY, nextSession);
    return false;
  }

  const botToken = String(data.bot_token ?? "").trim();
  if (!botToken) {
    await input.storage.put(WEIXIN_OC_LOGIN_SESSION_KEY, {
      ...nextSession,
      error: "Login succeeded, but the Weixin API did not return bot_token."
    });
    return false;
  }

  const accountId = stringFromUnknown(data.ilink_bot_id);
  const baseUrl = stringFromUnknown(data.baseurl) ?? input.config.baseUrl;
  const confirmedSession: WeixinOcLoginSession = {
    ...nextSession,
    botToken,
    accountId,
    baseUrl,
    userId: stringFromUnknown(data.ilink_user_id)
  };
  await persistWeixinOcAccountState(input.storage, input.config, {
    token: botToken,
    accountId,
    syncBuf: input.config.syncBuf,
    baseUrl,
    contextTokens: input.config.contextTokens
  });
  await saveWeixinOcTokenCredential(input.env, input.config.integrationId, botToken);
  await input.storage.put(WEIXIN_OC_LOGIN_SESSION_KEY, confirmedSession);
  await input.schedulePoll(1_000);
  return true;
}

function stringFromUnknown(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
