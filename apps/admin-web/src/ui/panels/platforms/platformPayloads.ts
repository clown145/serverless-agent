import type { AdminClient } from "../../../api/client";
import type { QqOfficialIntegrationDraft } from "./QqOfficialIntegrationForm";
import type { TelegramIntegrationDraft } from "./TelegramIntegrationForm";
import type { WecomIntegrationDraft } from "./WecomIntegrationForm";
import type { WeixinOcIntegrationDraft } from "./WeixinOcIntegrationForm";

type BodyOf<T extends (...args: never[]) => unknown> = Parameters<T>[0];
type UpdateBodyOf<T extends (...args: never[]) => unknown> = Parameters<T>[1];

export function telegramCreatePayload(
  draft: TelegramIntegrationDraft
): BodyOf<AdminClient["createTelegramIntegration"]> {
  return {
    agentId: valueOrUndefined(draft.agentId),
    name: draft.name,
    botToken: valueOrUndefined(draft.botToken),
    webhookSecret: valueOrUndefined(draft.webhookSecret),
    parseMode: draft.parseMode
  };
}

export function telegramUpdatePayload(
  draft: TelegramIntegrationDraft
): UpdateBodyOf<AdminClient["updateTelegramIntegration"]> {
  return telegramCreatePayload(draft);
}

export function qqCreatePayload(
  draft: QqOfficialIntegrationDraft
): BodyOf<AdminClient["createQqOfficialIntegration"]> {
  return {
    ...qqSharedPayload(draft),
    name: draft.name,
    appId: draft.appId
  };
}

export function qqUpdatePayload(
  draft: QqOfficialIntegrationDraft
): UpdateBodyOf<AdminClient["updateQqOfficialIntegration"]> {
  return {
    ...qqSharedPayload(draft),
    name: draft.name,
    appId: valueOrUndefined(draft.appId)
  };
}

export function wecomCreatePayload(
  draft: WecomIntegrationDraft
): BodyOf<AdminClient["createWecomIntegration"]> {
  return {
    ...wecomSharedPayload(draft),
    name: draft.name,
    corpId: draft.corpId
  };
}

export function wecomUpdatePayload(
  draft: WecomIntegrationDraft
): UpdateBodyOf<AdminClient["updateWecomIntegration"]> {
  return {
    ...wecomSharedPayload(draft),
    name: draft.name,
    corpId: valueOrUndefined(draft.corpId)
  };
}

export function weixinOcPayload(
  draft: WeixinOcIntegrationDraft
): BodyOf<AdminClient["createWeixinOcIntegration"]> {
  return {
    agentId: valueOrUndefined(draft.agentId),
    name: draft.name,
    baseUrl: valueOrUndefined(draft.baseUrl),
    cdnBaseUrl: valueOrUndefined(draft.cdnBaseUrl),
    botType: valueOrUndefined(draft.botType),
    qrPollIntervalMs: draft.qrPollIntervalMs,
    longPollTimeoutMs: draft.longPollTimeoutMs,
    apiTimeoutMs: draft.apiTimeoutMs,
    token: valueOrUndefined(draft.token),
    accountId: valueOrUndefined(draft.accountId)
  };
}

function qqSharedPayload(draft: QqOfficialIntegrationDraft) {
  return {
    agentId: valueOrUndefined(draft.agentId),
    secret: valueOrUndefined(draft.secret),
    connectionMode: draft.connectionMode,
    isSandbox: draft.isSandbox,
    enableGroupC2c: draft.enableGroupC2c,
    enableGuildDirectMessage: draft.enableGuildDirectMessage,
    enablePublicGuildMessages: draft.enablePublicGuildMessages
  };
}

function wecomSharedPayload(draft: WecomIntegrationDraft) {
  return {
    agentId: valueOrUndefined(draft.agentId),
    secret: valueOrUndefined(draft.secret),
    token: valueOrUndefined(draft.token),
    encodingAesKey: valueOrUndefined(draft.encodingAesKey),
    apiBaseUrl: valueOrUndefined(draft.apiBaseUrl),
    customerServiceName: valueOrUndefined(draft.customerServiceName),
    openKfId: valueOrUndefined(draft.openKfId),
    webhookSecret: valueOrUndefined(draft.webhookSecret)
  };
}

function valueOrUndefined(value: string): string | undefined {
  return value.trim() || undefined;
}
