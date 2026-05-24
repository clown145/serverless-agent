import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";
import type { WeixinOcLoginSession } from "../../adapters/weixin-oc/types";
import { nowIso } from "../../shared/time";
import {
  WEIXIN_OC_LOGIN_SESSION_KEY,
  WEIXIN_OC_RUNTIME_STATUS_KEY,
  type WeixinOcRuntimeStatus
} from "./weixin-oc-gateway-state";

export type WeixinOcGatewayStatus = {
  agentId: string;
  integrationId: string;
  configured: boolean;
  accountId?: string;
  baseUrl: string;
  syncBufLength: number;
  contextTokenCount: number;
  loginSession?: {
    sessionKey: string;
    status: string;
    qrcode: string;
    qrcodeImgContent: string;
    qrImageUrl: string;
    startedAt: string;
    error?: string;
  };
  updatedAt: string;
  lastError?: string;
};

export async function getWeixinOcGatewayStatus(
  storage: DurableObjectStorage,
  config: WeixinOcBotConfig
): Promise<WeixinOcGatewayStatus> {
  const loginSession = await storage.get<WeixinOcLoginSession>(
    WEIXIN_OC_LOGIN_SESSION_KEY
  );
  const runtimeStatus = await storage.get<WeixinOcRuntimeStatus>(
    WEIXIN_OC_RUNTIME_STATUS_KEY
  );

  return {
    agentId: config.agentId,
    integrationId: config.integrationId,
    configured: Boolean(config.token),
    accountId: config.accountId,
    baseUrl: config.baseUrl,
    syncBufLength: config.syncBuf.length,
    contextTokenCount: Object.keys(config.contextTokens).length,
    loginSession: loginSession
      ? {
          sessionKey: loginSession.sessionKey,
          status: loginSession.status,
          qrcode: loginSession.qrcode,
          qrcodeImgContent: loginSession.qrcodeImgContent,
          qrImageUrl: qrImageUrl(loginSession.qrcodeImgContent),
          startedAt: loginSession.startedAt,
          error: loginSession.error
        }
      : undefined,
    updatedAt: nowIso(),
    lastError: runtimeStatus?.lastError ?? config.integration.lastError
  };
}

function qrImageUrl(qrcodeImgContent: string): string {
  const url = new URL("https://api.qrserver.com/v1/create-qr-code/");
  url.searchParams.set("size", "300x300");
  url.searchParams.set("data", qrcodeImgContent);
  return url.toString();
}
