import type {
  QqOfficialIntegration,
  TelegramIntegration,
  WecomIntegration,
  WeixinOcIntegration
} from "../../../api/types";
import type { QqOfficialIntegrationDraft } from "./QqOfficialIntegrationForm";
import type { TelegramIntegrationDraft } from "./TelegramIntegrationForm";
import type { WecomIntegrationDraft } from "./WecomIntegrationForm";
import type { WeixinOcIntegrationDraft } from "./WeixinOcIntegrationForm";

export function defaultTelegramDraft(): TelegramIntegrationDraft {
  return {
    agentId: "default",
    name: "Telegram",
    botToken: "",
    webhookSecret: "",
    parseMode: "HTML"
  };
}

export function defaultQqDraft(): QqOfficialIntegrationDraft {
  return {
    agentId: "default",
    name: "QQ Official",
    appId: "",
    secret: "",
    connectionMode: "gateway",
    isSandbox: false,
    enableGroupC2c: true,
    enableGuildDirectMessage: true,
    enablePublicGuildMessages: true
  };
}

export function defaultWecomDraft(): WecomIntegrationDraft {
  return {
    agentId: "default",
    name: "WeCom Customer Service",
    corpId: "",
    secret: "",
    token: "",
    encodingAesKey: "",
    apiBaseUrl: "https://qyapi.weixin.qq.com/cgi-bin/",
    customerServiceName: "",
    openKfId: "",
    webhookSecret: ""
  };
}

export function defaultWeixinOcDraft(): WeixinOcIntegrationDraft {
  return {
    agentId: "default",
    name: "WeChat Personal",
    baseUrl: "https://ilinkai.weixin.qq.com",
    cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
    botType: "3",
    qrPollIntervalMs: 1000,
    longPollTimeoutMs: 35000,
    apiTimeoutMs: 15000,
    token: "",
    accountId: ""
  };
}

export function telegramDraftFromIntegration(
  integration: TelegramIntegration
): TelegramIntegrationDraft {
  return {
    agentId: integration.agentId,
    name: integration.name,
    botToken: "",
    webhookSecret: "",
    parseMode: integration.parseMode
  };
}

export function qqDraftFromIntegration(
  integration: QqOfficialIntegration
): QqOfficialIntegrationDraft {
  return {
    agentId: integration.agentId,
    name: integration.name,
    appId: integration.appId ?? "",
    secret: "",
    connectionMode: integration.connectionMode,
    isSandbox: integration.isSandbox,
    enableGroupC2c: integration.enableGroupC2c,
    enableGuildDirectMessage: integration.enableGuildDirectMessage,
    enablePublicGuildMessages: integration.enablePublicGuildMessages
  };
}

export function wecomDraftFromIntegration(integration: WecomIntegration): WecomIntegrationDraft {
  return {
    agentId: integration.agentId,
    name: integration.name,
    corpId: integration.corpId ?? "",
    secret: "",
    token: "",
    encodingAesKey: "",
    apiBaseUrl: integration.apiBaseUrl,
    customerServiceName: integration.customerServiceName ?? "",
    openKfId: integration.openKfId ?? "",
    webhookSecret: ""
  };
}

export function weixinOcDraftFromIntegration(
  integration: WeixinOcIntegration
): WeixinOcIntegrationDraft {
  return {
    agentId: integration.agentId,
    name: integration.name,
    baseUrl: integration.baseUrl,
    cdnBaseUrl: integration.cdnBaseUrl,
    botType: integration.botType,
    qrPollIntervalMs: integration.qrPollIntervalMs,
    longPollTimeoutMs: integration.longPollTimeoutMs,
    apiTimeoutMs: integration.apiTimeoutMs,
    token: "",
    accountId: integration.accountId ?? ""
  };
}
