import type {
  WecomAccessTokenResponse,
  WecomKfAccountListResponse,
  WecomKfContactWayResponse,
  WecomKfSendMessageResponse,
  WecomKfSyncMessageResponse
} from "./types";

const DEFAULT_WECOM_API_BASE_URL = "https://qyapi.weixin.qq.com/cgi-bin/";

export type WecomApiClientOptions = {
  corpId: string;
  secret: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class WecomApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly payload?: unknown
  ) {
    super(message);
    this.name = "WecomApiError";
  }
}

export class WecomApiClient {
  private readonly corpId: string;
  private readonly secret: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private accessToken?: { value: string; expiresAt: number };

  constructor(options: WecomApiClientOptions) {
    this.corpId = options.corpId;
    this.secret = options.secret;
    this.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) {
      return this.accessToken.value;
    }

    const url = new URL("gettoken", this.apiBaseUrl);
    url.searchParams.set("corpid", this.corpId);
    url.searchParams.set("corpsecret", this.secret);
    const payload = await this.fetchJson<WecomAccessTokenResponse>(url.toString());
    assertWecomOk(payload, "Failed to get WeCom access token");

    if (!payload.access_token) {
      throw new WecomApiError(
        "WeCom access token response is missing access_token",
        payload.errcode,
        payload
      );
    }

    this.accessToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max((payload.expires_in ?? 7200) - 120, 60) * 1000
    };
    return payload.access_token;
  }

  async listKfAccounts(): Promise<WecomKfAccountListResponse> {
    const payload = await this.getWithAccessToken<WecomKfAccountListResponse>("kf/account/list");
    assertWecomOk(payload, "Failed to list WeCom customer service accounts");
    return payload;
  }

  async addKfContactWay(openKfId: string, scene: string): Promise<WecomKfContactWayResponse> {
    const payload = await this.postWithAccessToken<WecomKfContactWayResponse>(
      "kf/add_contact_way",
      {
        open_kfid: openKfId,
        scene
      }
    );
    assertWecomOk(payload, "Failed to create WeCom customer service contact URL");
    return payload;
  }

  async syncKfMessages(input: {
    token?: string;
    openKfId: string;
    cursor?: string;
    limit?: number;
  }): Promise<WecomKfSyncMessageResponse> {
    const payload = await this.postWithAccessToken<WecomKfSyncMessageResponse>("kf/sync_msg", {
      token: input.token ?? "",
      open_kfid: input.openKfId,
      cursor: input.cursor ?? "",
      limit: input.limit ?? 1000
    });
    assertWecomOk(payload, "Failed to sync WeCom customer service messages");
    return payload;
  }

  async sendKfText(input: {
    toUser: string;
    openKfId: string;
    content: string;
    msgId?: string;
  }): Promise<WecomKfSendMessageResponse> {
    const body: Record<string, unknown> = {
      touser: input.toUser,
      open_kfid: input.openKfId,
      msgtype: "text",
      text: {
        content: input.content
      }
    };
    if (input.msgId) {
      body.msgid = input.msgId;
    }

    const payload = await this.postWithAccessToken<WecomKfSendMessageResponse>("kf/send_msg", body);
    assertWecomOk(payload, "Failed to send WeCom customer service text");
    return payload;
  }

  private async getWithAccessToken<T>(path: string): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = new URL(path, this.apiBaseUrl);
    url.searchParams.set("access_token", accessToken);
    return this.fetchJson<T>(url.toString());
  }

  private async postWithAccessToken<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = new URL(path, this.apiBaseUrl);
    url.searchParams.set("access_token", accessToken);
    return this.fetchJson<T>(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(url, init);
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new WecomApiError(`WeCom API returned non-JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
      throw new WecomApiError(`WeCom API HTTP ${response.status}`, undefined, payload);
    }

    return payload as T;
  }
}

export function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  let base = apiBaseUrl?.trim() || DEFAULT_WECOM_API_BASE_URL;
  base = base.replace(/\/+$/g, "");
  if (!base.endsWith("/cgi-bin")) {
    base += "/cgi-bin";
  }
  if (!base.endsWith("/")) {
    base += "/";
  }
  return base;
}

export function assertWecomOk(
  payload: { errcode?: number; errmsg?: string },
  message: string
): void {
  const code = payload.errcode ?? 0;
  if (code !== 0) {
    throw new WecomApiError(`${message}: ${code} ${payload.errmsg ?? ""}`.trim(), code, payload);
  }
}
