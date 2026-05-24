import { WeixinOcApiClient } from "../../adapters/weixin-oc/api";
import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";

export function createWeixinOcGatewayClient(config: WeixinOcBotConfig): WeixinOcApiClient {
  return new WeixinOcApiClient({
    baseUrl: config.baseUrl,
    cdnBaseUrl: config.cdnBaseUrl,
    apiTimeoutMs: config.apiTimeoutMs,
    token: config.token
  });
}
