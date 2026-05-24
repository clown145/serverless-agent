import { resolveQqOfficialBotForAgent } from "../../adapters/qq/official/config";
import {
  getStoredQqOfficialGatewayStatus,
  QqOfficialGatewaySession
} from "../../adapters/qq/official/gateway-session";
import {
  getQqOfficialConversation,
  targetFromStoredConversation
} from "../../adapters/qq/official/conversation-store";
import { QqOfficialApiClient } from "../../adapters/qq/official/api";
import { qqOfficialFileDataBase64, qqOfficialFileType } from "../../adapters/qq/official/media";
import type { OutboundFile } from "../outbound/types";
import type { Env } from "../../shared/types/env";
import { errorResponse, jsonResponse } from "../../shared/http";

const SESSION_CACHE_KEY = "session";

export class QQOfficialGatewayDurableObject {
  private session?: QqOfficialGatewaySession;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? this.env.DEFAULT_AGENT_ID ?? "default";

    try {
      if (request.method === "POST" && url.pathname === "/connect") {
        const session = await this.getSession(agentId);
        const status = await session.ensureConnected();
        await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
        return jsonResponse({ ok: true, status });
      }

      if (request.method === "POST" && url.pathname === "/disconnect") {
        const session = await this.getSession(agentId);
        await session.close();
        await this.state.storage.delete(SESSION_CACHE_KEY);
        return jsonResponse({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/send") {
        const input = (await request.json()) as QqOfficialSendRequest;
        const result = await this.send(agentId, normalizeSendRequest(input));
        return jsonResponse({ ok: true, result });
      }
    } catch (error) {
      return errorResponse(
        500,
        "qq_official_gateway_error",
        error instanceof Error ? error.message : "QQ official gateway failed"
      );
    }

    if (request.method === "GET" && url.pathname === "/status") {
      const storedStatus = await getStoredQqOfficialGatewayStatus(this.state.storage);
      return jsonResponse({ ok: true, status: storedStatus });
    }

    return errorResponse(404, "not_found", "QQ official gateway route not found");
  }

  async alarm(): Promise<void> {
    const agentId =
      (await this.state.storage.get<string>("agent_id")) ?? this.env.DEFAULT_AGENT_ID ?? "default";
    const session = await this.getSession(agentId);
    await session.ensureConnected();
    await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }

  private async getSession(agentId: string): Promise<QqOfficialGatewaySession> {
    await this.state.storage.put("agent_id", agentId);
    if (this.session) {
      return this.session;
    }

    const config = await resolveQqOfficialBotForAgent(this.env, agentId);
    if (!config.appId || !config.secret) {
      throw new Error("QQ official appId/secret is not configured");
    }

    this.session = new QqOfficialGatewaySession(this.state, this.env, {
      agentId: config.agentId,
      appId: config.appId,
      secret: config.secret,
      intent: config.intent,
      isSandbox: config.isSandbox
    });
    await this.state.storage.put(SESSION_CACHE_KEY, true);
    return this.session;
  }

  private async send(
    agentId: string,
    input: QqOfficialSendRequest
  ): Promise<QqOfficialSendResponse> {
    if (!input.conversationId || (!input.text && !input.file)) {
      return { ok: false, error: "conversationId and text or file are required" };
    }

    const config = await resolveQqOfficialBotForAgent(this.env, agentId);
    if (!config.appId || !config.secret) {
      return { ok: false, error: "QQ official appId/secret is not configured" };
    }

    const conversation = await getQqOfficialConversation(this.state.storage, input.conversationId);
    if (!conversation) {
      return {
        ok: false,
        error: "QQ official conversation is unknown until the bot receives a message from it"
      };
    }

    const api = new QqOfficialApiClient({
      appId: config.appId,
      secret: config.secret,
      isSandbox: config.isSandbox
    });
    const target = targetFromStoredConversation(conversation);
    const common: QqOfficialSendCommon = {
      content: input.text,
      msgId: input.replyToMessageId ?? conversation.lastMessageId,
      eventId: conversation.lastEventId
    };

    if (target.kind === "group") {
      if (!input.file) {
        const response = await api.sendGroupText({
          groupOpenId: target.groupOpenId,
          content: input.text ?? "",
          msgId: common.msgId,
          eventId: common.eventId
        });
        return { ok: true, providerMessageId: response.id };
      }

      common.media = await api.uploadGroupFile({
        groupOpenId: target.groupOpenId,
        fileDataBase64: qqOfficialFileDataBase64(input.file),
        fileType: qqOfficialFileType(input.file)
      });
      common.msgType = 7;
      const response = await api.sendGroupMessage({
        groupOpenId: target.groupOpenId,
        ...common
      });
      return { ok: true, providerMessageId: response.id };
    }
    if (target.kind === "c2c") {
      if (!input.file) {
        const response = await api.sendC2cText({
          openId: target.openId,
          content: input.text ?? "",
          msgId: common.msgId,
          eventId: common.eventId
        });
        return { ok: true, providerMessageId: response.id };
      }

      common.media = await api.uploadC2cFile({
        openId: target.openId,
        fileDataBase64: qqOfficialFileDataBase64(input.file),
        fileType: qqOfficialFileType(input.file)
      });
      common.msgType = 7;
      const response = await api.sendC2cMessage({
        openId: target.openId,
        ...common
      });
      return { ok: true, providerMessageId: response.id };
    }
    if (input.file) {
      return {
        ok: false,
        error: "QQ official file upload is currently supported for group and C2C conversations only"
      };
    }
    if (target.kind === "direct") {
      const response = await api.sendDirectText({
        guildId: target.guildId,
        ...textOnlyCommon(common)
      });
      return { ok: true, providerMessageId: response.id };
    }

    const response = await api.sendChannelText({
      channelId: target.channelId,
      ...textOnlyCommon(common)
    });
    return { ok: true, providerMessageId: response.id };
  }
}

export type QqOfficialSendRequest = {
  conversationId: string;
  text?: string;
  file?: OutboundFile;
  replyToMessageId?: string;
};

export type QqOfficialSendResponse = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

type QqOfficialSendCommon = {
  content?: string;
  msgId?: string;
  eventId?: string;
  media?: {
    file_uuid: string;
    file_info: string;
    ttl?: number;
  };
  msgType?: number;
};

function normalizeSendRequest(input: QqOfficialSendRequest): QqOfficialSendRequest {
  if (!input.file) {
    return input;
  }

  return {
    ...input,
    file: {
      ...input.file,
      bytes: Array.isArray(input.file.bytes) ? new Uint8Array(input.file.bytes) : input.file.bytes
    }
  };
}

function textOnlyCommon(common: QqOfficialSendCommon): {
  content: string;
  msgId?: string;
  eventId?: string;
} {
  return {
    content: common.content ?? "",
    msgId: common.msgId,
    eventId: common.eventId
  };
}
