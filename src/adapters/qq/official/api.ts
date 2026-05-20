import {
  QQ_OFFICIAL_API_BASE_URL,
  QQ_OFFICIAL_AUTH_BASE_URL,
  QQ_OFFICIAL_SANDBOX_API_BASE_URL,
  type QqOfficialAccessToken,
  type QqOfficialFileUploadResponse,
  type QqOfficialGatewayInfo,
  type QqOfficialMedia,
  type QqOfficialMessageSendResponse
} from "./types";

export type QqOfficialApiClientOptions = {
  appId: string;
  secret: string;
  isSandbox?: boolean;
  fetcher?: typeof fetch;
};

export class QqOfficialApiClient {
  private token?: QqOfficialAccessToken;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: QqOfficialApiClientOptions) {
    this.baseUrl = options.isSandbox
      ? QQ_OFFICIAL_SANDBOX_API_BASE_URL
      : QQ_OFFICIAL_API_BASE_URL;
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  }

  async getGatewayBot(): Promise<QqOfficialGatewayInfo> {
    const payload = await this.request<RawGatewayBotResponse>("/gateway/bot");
    return normalizeGatewayInfo(payload);
  }

  async sendGroupMessage(input: {
    groupOpenId: string;
    content: string;
    msgId?: string;
    msgSeq?: number;
    eventId?: string;
  }): Promise<QqOfficialMessageSendResponse> {
    return this.request<QqOfficialMessageSendResponse>(
      `/v2/groups/${encodeURIComponent(input.groupOpenId)}/messages`,
      {
        method: "POST",
        body: {
          content: input.content,
          msg_type: 0,
          msg_id: input.msgId,
          msg_seq: input.msgSeq ?? randomMessageSeq(),
          event_id: input.eventId
        }
      }
    );
  }

  async sendC2cMessage(input: {
    openId: string;
    content: string;
    msgId?: string;
    msgSeq?: number;
    eventId?: string;
  }): Promise<QqOfficialMessageSendResponse> {
    return this.request<QqOfficialMessageSendResponse>(
      `/v2/users/${encodeURIComponent(input.openId)}/messages`,
      {
        method: "POST",
        body: {
          content: input.content,
          msg_type: 0,
          msg_id: input.msgId,
          msg_seq: input.msgSeq ?? randomMessageSeq(),
          event_id: input.eventId
        }
      }
    );
  }

  async sendChannelMessage(input: {
    channelId: string;
    content: string;
    msgId?: string;
    eventId?: string;
  }): Promise<QqOfficialMessageSendResponse> {
    return this.request<QqOfficialMessageSendResponse>(
      `/channels/${encodeURIComponent(input.channelId)}/messages`,
      {
        method: "POST",
        body: {
          content: input.content,
          msg_id: input.msgId,
          event_id: input.eventId
        }
      }
    );
  }

  async sendDirectMessage(input: {
    guildId: string;
    content: string;
    msgId?: string;
    eventId?: string;
  }): Promise<QqOfficialMessageSendResponse> {
    return this.request<QqOfficialMessageSendResponse>(
      `/dms/${encodeURIComponent(input.guildId)}/messages`,
      {
        method: "POST",
        body: {
          content: input.content,
          msg_id: input.msgId,
          event_id: input.eventId
        }
      }
    );
  }

  async uploadGroupFile(input: {
    groupOpenId: string;
    fileDataBase64: string;
    fileType: number;
  }): Promise<QqOfficialMedia> {
    const response = await this.request<QqOfficialFileUploadResponse>(
      `/v2/groups/${encodeURIComponent(input.groupOpenId)}/files`,
      {
        method: "POST",
        body: {
          group_openid: input.groupOpenId,
          file_data: input.fileDataBase64,
          file_type: input.fileType,
          srv_send_msg: false
        }
      }
    );
    return {
      file_uuid: response.file_uuid,
      file_info: response.file_info,
      ttl: response.ttl
    };
  }

  async uploadC2cFile(input: {
    openId: string;
    fileDataBase64: string;
    fileType: number;
  }): Promise<QqOfficialMedia> {
    const response = await this.request<QqOfficialFileUploadResponse>(
      `/v2/users/${encodeURIComponent(input.openId)}/files`,
      {
        method: "POST",
        body: {
          openid: input.openId,
          file_data: input.fileDataBase64,
          file_type: input.fileType,
          srv_send_msg: false
        }
      }
    );
    return {
      file_uuid: response.file_uuid,
      file_info: response.file_info,
      ttl: response.ttl
    };
  }

  async botToken(): Promise<string> {
    const token = await this.accessToken();
    return `QQBot ${token}`;
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const token = await this.accessToken();
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        authorization: `QQBot ${token}`,
        "content-type": "application/json"
      },
      body: options.body ? JSON.stringify(pruneUndefined(options.body)) : undefined
    });
    const payload = (await response.json().catch(() => undefined)) as
      | Record<string, unknown>
      | undefined;

    if (!response.ok) {
      throw new Error(qqOfficialApiError(response.status, payload));
    }

    return payload as T;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt - Date.now() > 60_000) {
      return this.token.accessToken;
    }

    const response = await this.fetcher(`${QQ_OFFICIAL_AUTH_BASE_URL}/app/getAppAccessToken`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appId: this.options.appId,
        clientSecret: this.options.secret
      })
    });
    const payload = (await response.json().catch(() => undefined)) as
      | RawAccessTokenResponse
      | undefined;

    if (!response.ok || !payload?.access_token) {
      throw new Error(qqOfficialApiError(response.status, payload));
    }

    const expiresInSeconds = Number(payload.expires_in ?? 7200);
    this.token = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };
    return this.token.accessToken;
  }
}

type RawAccessTokenResponse = {
  access_token?: string;
  expires_in?: string | number;
  message?: string;
  code?: number;
};

type RawGatewayBotResponse = {
  url?: string;
  shards?: number;
  session_start_limit?: {
    total?: number;
    remaining?: number;
    reset_after?: number;
    max_concurrency?: number;
  };
};

function normalizeGatewayInfo(payload: RawGatewayBotResponse): QqOfficialGatewayInfo {
  if (!payload.url) {
    throw new Error("QQ official gateway response is missing url");
  }

  return {
    url: payload.url,
    shards: payload.shards ?? 1,
    sessionStartLimit: {
      total: payload.session_start_limit?.total,
      remaining: payload.session_start_limit?.remaining ?? 1,
      resetAfter: payload.session_start_limit?.reset_after,
      maxConcurrency: payload.session_start_limit?.max_concurrency ?? 1
    }
  };
}

function pruneUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

function randomMessageSeq(): number {
  return Math.floor(Math.random() * 10_000) + 1;
}

function qqOfficialApiError(
  status: number,
  payload: Record<string, unknown> | undefined
): string {
  const message = typeof payload?.message === "string" ? payload.message : undefined;
  const code = typeof payload?.code === "number" ? ` ${payload.code}` : "";
  return message
    ? `QQ official API error${code}: ${message}`
    : `QQ official API error ${status}`;
}
