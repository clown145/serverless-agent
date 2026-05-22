import {
  formatWeixinOcApiError,
  isSuccessfulWeixinOcPayload,
  WeixinOcApiClient,
  weixinOcApiErrcode
} from "../../adapters/weixin-oc/api";
import {
  resolveWeixinOcBotByIntegrationId,
  resolveWeixinOcBotForAgent
} from "../../adapters/weixin-oc/config";
import { saveWeixinOcTokenCredential } from "../../adapters/weixin-oc/credential";
import {
  buildWeixinOcTextItem,
  normalizeWeixinOcInboundMessage
} from "../../adapters/weixin-oc/normalize";
import { persistWeixinOcInboundMedia } from "../../adapters/weixin-oc/inbound-media";
import {
  buildWeixinOcFileItem,
  buildWeixinOcImageItem,
  uploadWeixinOcMedia
} from "../../adapters/weixin-oc/media";
import { getWeixinOcAccountState, withWeixinOcAccountState } from "../../adapters/weixin-oc/state";
import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";
import type {
  WeixinOcAccountState,
  WeixinOcLoginSession,
  WeixinOcSendItem
} from "../../adapters/weixin-oc/types";
import { createId } from "../../shared/ids";
import { errorResponse, jsonResponse } from "../../shared/http";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { InternalMessage } from "../../shared/types/internal-message";
import type { QueueMessageBody } from "../../shared/types/queue";
import {
  clearPlatformIntegrationCredential,
  getPlatformIntegrationRecord,
  updatePlatformIntegrationCheck,
  updatePlatformIntegrationConfig
} from "../../storage/repositories/platform-integrations-repository";

const SESSION_TIMEOUT_ERRCODE = -14;
const LOGIN_SESSION_TTL_MS = 5 * 60 * 1000;
const LOGIN_SESSION_KEY = "login_session";
const AGENT_ID_KEY = "agent_id";
const INTEGRATION_ID_KEY = "integration_id";
const QR_EXPIRED_COUNT_KEY = "qr_expired_count";

export class WeixinOcGatewayDurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? this.env.DEFAULT_AGENT_ID ?? "default";
    const integrationId = url.searchParams.get("integrationId") ?? undefined;

    try {
      if (request.method === "POST" && url.pathname === "/connect") {
        const status = await this.ensureRunning(agentId, integrationId);
        return jsonResponse({ ok: true, status });
      }

      if (request.method === "POST" && url.pathname === "/login/start") {
        const status = await this.startLogin(agentId, true, integrationId);
        return jsonResponse({ ok: true, status });
      }

      if (request.method === "POST" && url.pathname === "/disconnect") {
        await this.clearLoginState(agentId, integrationId);
        await this.state.storage.delete(LOGIN_SESSION_KEY);
        await this.state.storage.delete(QR_EXPIRED_COUNT_KEY);
        return jsonResponse({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/send") {
        const input = (await request.json().catch(() => ({}))) as {
          userId?: string;
          text?: string;
          kind?: "text" | "image" | "file";
          file?: {
            bytes?: number[];
            fileName?: string;
            mimeType?: string;
          };
        };
        const result = await this.sendMessage(agentId, input, integrationId);
        return jsonResponse({ ok: result.ok, result }, { status: result.ok ? 200 : 400 });
      }

      if (request.method === "POST" && url.pathname === "/typing") {
        const input = (await request.json().catch(() => ({}))) as { userId?: string };
        await this.sendTyping(agentId, input.userId, integrationId);
        return jsonResponse({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/poll") {
        const status = await this.pollOnce(agentId, integrationId);
        return jsonResponse({ ok: true, status });
      }
    } catch (error) {
      return errorResponse(
        500,
        "weixin_oc_gateway_error",
        error instanceof Error ? error.message : "Weixin OC gateway failed"
      );
    }

    if (request.method === "GET" && url.pathname === "/status") {
      const status = await this.status(agentId, integrationId);
      return jsonResponse({ ok: true, status });
    }

    return errorResponse(404, "not_found", "Weixin OC gateway route not found");
  }

  async alarm(): Promise<void> {
    const agentId =
      (await this.state.storage.get<string>(AGENT_ID_KEY)) ??
      this.env.DEFAULT_AGENT_ID ??
      "default";
    const integrationId = await this.state.storage.get<string>(INTEGRATION_ID_KEY);
    await this.pollOnce(agentId, integrationId);
  }

  private async ensureRunning(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await this.state.storage.put(AGENT_ID_KEY, agentId);
    await this.state.storage.put(INTEGRATION_ID_KEY, config.integrationId);

    if (!config.token) {
      return this.startLogin(agentId, false, integrationId);
    }

    await this.schedulePoll(1_000);
    await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {});
    return this.status(agentId, integrationId);
  }

  private async startLogin(
    agentId: string,
    forceRefresh: boolean,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await this.state.storage.put(AGENT_ID_KEY, agentId);
    await this.state.storage.put(INTEGRATION_ID_KEY, config.integrationId);

    const existing = await this.state.storage.get<WeixinOcLoginSession>(LOGIN_SESSION_KEY);
    if (!forceRefresh && isLoginSessionValid(existing)) {
      await this.schedulePoll(config.qrPollIntervalMs);
      return this.status(agentId, integrationId);
    }

    const client = this.createClient(config);
    const payload = await client.getLoginQrCode(config.botType);
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
    await this.state.storage.put(LOGIN_SESSION_KEY, loginSession);
    await this.state.storage.put(QR_EXPIRED_COUNT_KEY, 0);
    await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {});
    await this.schedulePoll(config.qrPollIntervalMs);
    return this.status(agentId, integrationId);
  }

  private async pollOnce(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    await this.state.storage.put(AGENT_ID_KEY, agentId);
    await this.state.storage.put(INTEGRATION_ID_KEY, config.integrationId);

    if (!config.token) {
      if (!(await this.pollLogin(config))) {
        await this.schedulePoll(config.qrPollIntervalMs);
      }
      return this.status(agentId, integrationId);
    }

    try {
      await this.pollUpdates(config);
      await this.schedulePoll(1_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Weixin OC poll failed";
      await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {
        lastError: message
      });
      await this.schedulePoll(5_000);
    }
    return this.status(agentId, integrationId);
  }

  private async pollLogin(config: WeixinOcBotConfig): Promise<boolean> {
    const loginSession = await this.state.storage.get<WeixinOcLoginSession>(LOGIN_SESSION_KEY);
    if (!isLoginSessionValid(loginSession)) {
      await this.startLogin(config.agentId, true, config.integrationId);
      return false;
    }

    const client = this.createClient(config);
    const data = await client.getQrCodeStatus(
      loginSession.qrcode,
      config.longPollTimeoutMs
    );
    const status = String(data.status ?? "wait").trim();
    const nextSession: WeixinOcLoginSession = {
      ...loginSession,
      status
    };

    if (status === "expired") {
      const expiredCount = ((await this.state.storage.get<number>(QR_EXPIRED_COUNT_KEY)) ?? 0) + 1;
      await this.state.storage.put(QR_EXPIRED_COUNT_KEY, expiredCount);
      if (expiredCount > 3) {
        await this.state.storage.put(LOGIN_SESSION_KEY, {
          ...nextSession,
          error: "二维码已过期，请重新开始扫码登录"
        });
        return false;
      }
      await this.startLogin(config.agentId, true, config.integrationId);
      return false;
    }

    if (status !== "confirmed") {
      await this.state.storage.put(LOGIN_SESSION_KEY, nextSession);
      return false;
    }

    const botToken = String(data.bot_token ?? "").trim();
    if (!botToken) {
      await this.state.storage.put(LOGIN_SESSION_KEY, {
        ...nextSession,
        error: "登录成功但微信接口未返回 bot_token"
      });
      return false;
    }

    const accountId = stringFromUnknown(data.ilink_bot_id);
    const baseUrl = stringFromUnknown(data.baseurl) ?? config.baseUrl;
    const confirmedSession: WeixinOcLoginSession = {
      ...nextSession,
      botToken,
      accountId,
      baseUrl,
      userId: stringFromUnknown(data.ilink_user_id)
    };
    await this.persistAccountState(config, {
      token: botToken,
      accountId,
      syncBuf: config.syncBuf,
      baseUrl,
      contextTokens: config.contextTokens
    });
    await saveWeixinOcTokenCredential(this.env, config.integrationId, botToken);
    await this.state.storage.put(LOGIN_SESSION_KEY, confirmedSession);
    await this.schedulePoll(1_000);
    return true;
  }

  private async pollUpdates(config: WeixinOcBotConfig): Promise<void> {
    const client = this.createClient(config);
    const data = await client.getUpdates(config.syncBuf, config.longPollTimeoutMs);
    if (!isSuccessfulWeixinOcPayload(data as Record<string, unknown>)) {
      if (weixinOcApiErrcode(data as Record<string, unknown>) === SESSION_TIMEOUT_ERRCODE) {
        await this.clearLoginState(config.agentId, config.integrationId);
        return;
      }
      throw new Error(formatWeixinOcApiError(data as Record<string, unknown>));
    }

    const nextState: WeixinOcAccountState = {
      token: config.token,
      accountId: config.accountId,
      syncBuf: data.get_updates_buf ?? config.syncBuf,
      baseUrl: config.baseUrl,
      contextTokens: { ...config.contextTokens }
    };
    let dirty = data.get_updates_buf !== undefined && data.get_updates_buf !== config.syncBuf;

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
      const normalized = normalizeWeixinOcInboundMessage(message, config.agentId);
      if (!normalized) {
        continue;
      }
      await this.dispatchInbound(
        config.agentId,
        await persistWeixinOcInboundMedia(this.env, config, normalized)
      );
    }

    if (dirty) {
      await this.persistAccountState(config, nextState);
    } else {
      await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {});
    }
  }

  private async sendMessage(
    agentId: string,
    input: {
      userId?: string;
      text?: string;
      kind?: "text" | "image" | "file";
      file?: {
        bytes?: number[];
        fileName?: string;
        mimeType?: string;
      };
    },
    integrationId?: string
  ): Promise<{ ok: boolean; providerMessageId?: string; error?: string }> {
    const config = await this.requireConfig(agentId, integrationId);
    const userId = input.userId?.trim();
    const text = input.text?.trim();
    const kind = input.kind ?? "text";
    if (!userId) {
      return { ok: false, error: "userId is required" };
    }
    if (kind === "text" && !text) {
      return { ok: false, error: "text is required" };
    }
    if (!config.token) {
      return { ok: false, error: "Weixin OC is not logged in" };
    }

    const contextToken = config.contextTokens[userId];
    if (!contextToken) {
      return {
        ok: false,
        error: "context_token missing. Ask this WeChat user to send one message first."
      };
    }

    const itemList: WeixinOcSendItem[] = [];
    if (kind === "text") {
      itemList.push(buildWeixinOcTextItem(text ?? ""));
    } else {
      const file = parseGatewayFile(input.file);
      if (!file) {
        return { ok: false, error: "file bytes, fileName, and mimeType are required" };
      }
      if (text) {
        itemList.push(buildWeixinOcTextItem(text));
      }
      const client = this.createClient(config);
      const uploaded = await uploadWeixinOcMedia({
        client,
        cdnBaseUrl: config.cdnBaseUrl,
        toUserId: userId,
        file,
        kind
      });
      itemList.push(
        kind === "image"
          ? buildWeixinOcImageItem(uploaded)
          : buildWeixinOcFileItem({
              uploaded,
              fileName: file.fileName
            })
      );
    }

    return this.sendItems(config, userId, contextToken, itemList);
  }

  private async sendItems(
    config: WeixinOcBotConfig,
    userId: string,
    contextToken: string,
    itemList: WeixinOcSendItem[]
  ): Promise<{ ok: boolean; providerMessageId?: string; error?: string }> {
    let providerMessageId: string | undefined;

    for (const item of itemList) {
      const payload = await this.createClient(config).sendMessage({
        toUserId: userId,
        contextToken,
        itemList: [item]
      });
      if (!isSuccessfulWeixinOcPayload(payload as Record<string, unknown>)) {
        return {
          ok: false,
          error: formatWeixinOcApiError(payload as Record<string, unknown>)
        };
      }
      providerMessageId = payload.message_id ?? payload.msg_id ?? createId("wxoc_sent");
    }

    return {
      ok: true,
      providerMessageId
    };
  }

  private async sendTyping(
    agentId: string,
    userId: string | undefined,
    integrationId?: string
  ): Promise<void> {
    const config = await this.requireConfig(agentId, integrationId);
    const cleanUserId = userId?.trim();
    if (!cleanUserId || !config.token) {
      return;
    }
    const contextToken = config.contextTokens[cleanUserId];
    if (!contextToken) {
      return;
    }

    const client = this.createClient(config);
    const configPayload = await client.getTypingConfig({
      userId: cleanUserId,
      contextToken
    });
    if (!isSuccessfulWeixinOcPayload(configPayload)) {
      return;
    }
    const typingTicket = String(configPayload.typing_ticket ?? "").trim();
    if (!typingTicket) {
      return;
    }
    await client.sendTypingState({
      userId: cleanUserId,
      typingTicket
    });
  }

  private async status(
    agentId: string,
    integrationId?: string
  ): Promise<WeixinOcGatewayStatus> {
    const config = await this.requireConfig(agentId, integrationId);
    const loginSession = await this.state.storage.get<WeixinOcLoginSession>(LOGIN_SESSION_KEY);

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
      lastError: config.integration.lastError
    };
  }

  private async clearLoginState(
    agentId: string,
    integrationId?: string
  ): Promise<void> {
    const config = await this.requireConfig(agentId, integrationId);
    await this.persistAccountState(config, {
      token: undefined,
      accountId: undefined,
      syncBuf: "",
      baseUrl: config.baseUrl,
      contextTokens: {}
    });
    await clearPlatformIntegrationCredential(this.env.AGENT_DB, config.integrationId);
    await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {
      lastError: "Weixin OC login state cleared"
    });
  }

  private createClient(config: WeixinOcBotConfig): WeixinOcApiClient {
    return new WeixinOcApiClient({
      baseUrl: config.baseUrl,
      cdnBaseUrl: config.cdnBaseUrl,
      apiTimeoutMs: config.apiTimeoutMs,
      token: config.token
    });
  }

  private async persistAccountState(
    config: WeixinOcBotConfig,
    state: Partial<WeixinOcAccountState>
  ): Promise<void> {
    const integration = await getPlatformIntegrationRecord(
      this.env.AGENT_DB,
      config.integrationId
    );
    if (!integration) {
      throw new Error("Weixin OC integration not found while saving state");
    }

    const nextConfig = withWeixinOcAccountState(
      {
        ...integration.config,
        token: ""
      },
      {
        ...getWeixinOcAccountState(integration.config),
        ...state,
        token: ""
      }
    );
    await updatePlatformIntegrationConfig(this.env.AGENT_DB, config.integrationId, nextConfig);
    await updatePlatformIntegrationCheck(this.env.AGENT_DB, config.integrationId, {});
  }

  private async requireConfig(agentId: string, integrationId?: string) {
    const config = integrationId
      ? await resolveWeixinOcBotByIntegrationId(this.env, integrationId)
      : await resolveWeixinOcBotForAgent(this.env, agentId);
    if (!config) {
      throw new Error("Weixin OC integration is not configured");
    }
    return config;
  }

  private async dispatchInbound(agentId: string, message: InternalMessage): Promise<void> {
    const job: QueueMessageBody = {
      type: "inbound.message",
      eventId: createId("evt"),
      agentId,
      message,
      receivedAt: nowIso()
    };
    await this.env.AGENT_QUEUE.send(job);
  }

  private async schedulePoll(delayMs: number): Promise<void> {
    await this.state.storage.setAlarm(Date.now() + delayMs);
  }
}

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

function isLoginSessionValid(
  loginSession: WeixinOcLoginSession | undefined
): loginSession is WeixinOcLoginSession {
  if (!loginSession) {
    return false;
  }
  return Date.now() - new Date(loginSession.startedAt).getTime() < LOGIN_SESSION_TTL_MS;
}

function qrImageUrl(qrcodeImgContent: string): string {
  const url = new URL("https://api.qrserver.com/v1/create-qr-code/");
  url.searchParams.set("size", "300x300");
  url.searchParams.set("data", qrcodeImgContent);
  return url.toString();
}

function stringFromUnknown(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseGatewayFile(input: {
  bytes?: number[];
  fileName?: string;
  mimeType?: string;
} | undefined): { bytes: Uint8Array; fileName: string; mimeType: string } | undefined {
  const fileName = input?.fileName?.trim();
  const mimeType = input?.mimeType?.trim();
  if (!fileName || !mimeType || !Array.isArray(input?.bytes)) {
    return undefined;
  }
  if (input.bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return undefined;
  }
  return {
    bytes: new Uint8Array(input.bytes),
    fileName,
    mimeType
  };
}
