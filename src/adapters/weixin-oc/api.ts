import type {
  WeixinOcApiConfig,
  WeixinOcGetUploadUrlInput,
  WeixinOcGetUploadUrlResult,
  WeixinOcSendItem,
  WeixinOcSendResult,
  WeixinOcUpdatesResponse
} from "./types";

const DEFAULT_BASE_INFO = {
  channel_version: "astrbot"
};

export class WeixinOcApiClient {
  private baseUrl: string;
  private cdnBaseUrl: string;
  private apiTimeoutMs: number;
  private token?: string;

  constructor(config: WeixinOcApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.cdnBaseUrl = config.cdnBaseUrl.replace(/\/+$/, "");
    this.apiTimeoutMs = config.apiTimeoutMs;
    this.token = config.token;
  }

  update(config: Partial<WeixinOcApiConfig>): void {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    }
    if (config.cdnBaseUrl) {
      this.cdnBaseUrl = config.cdnBaseUrl.replace(/\/+$/, "");
    }
    if (config.apiTimeoutMs) {
      this.apiTimeoutMs = config.apiTimeoutMs;
    }
    if ("token" in config) {
      this.token = config.token;
    }
  }

  async getLoginQrCode(botType: string): Promise<{
    qrcode: string;
    qrcode_img_content: string;
  }> {
    return this.requestJson("GET", "ilink/bot/get_bot_qrcode", {
      params: { bot_type: botType },
      tokenRequired: false,
      timeoutMs: 15_000
    });
  }

  async getQrCodeStatus(qrcode: string, timeoutMs: number): Promise<Record<string, unknown>> {
    return this.requestJson("GET", "ilink/bot/get_qrcode_status", {
      params: { qrcode },
      tokenRequired: false,
      timeoutMs,
      headers: { "iLink-App-ClientVersion": "1" }
    });
  }

  async getUpdates(syncBuf: string, timeoutMs: number): Promise<WeixinOcUpdatesResponse> {
    return this.requestJson("POST", "ilink/bot/getupdates", {
      payload: {
        base_info: DEFAULT_BASE_INFO,
        get_updates_buf: syncBuf
      },
      tokenRequired: true,
      timeoutMs
    });
  }

  async getUploadUrl(input: WeixinOcGetUploadUrlInput): Promise<WeixinOcGetUploadUrlResult> {
    return this.requestJson("POST", "ilink/bot/getuploadurl", {
      payload: {
        filekey: input.filekey,
        media_type: input.media_type,
        to_user_id: input.to_user_id,
        rawsize: input.rawsize,
        rawfilemd5: input.rawfilemd5,
        filesize: input.filesize,
        thumb_rawsize: input.thumb_rawsize,
        thumb_rawfilemd5: input.thumb_rawfilemd5,
        thumb_filesize: input.thumb_filesize,
        no_need_thumb: input.no_need_thumb,
        aeskey: input.aeskey,
        base_info: DEFAULT_BASE_INFO
      },
      tokenRequired: true
    });
  }

  async sendMessage(input: {
    toUserId: string;
    contextToken: string;
    itemList: WeixinOcSendItem[];
  }): Promise<WeixinOcSendResult> {
    return this.requestJson("POST", "ilink/bot/sendmessage", {
      payload: {
        base_info: DEFAULT_BASE_INFO,
        msg: {
          from_user_id: "",
          to_user_id: input.toUserId,
          client_id: crypto.randomUUID().replace(/-/g, ""),
          message_type: 2,
          message_state: 2,
          context_token: input.contextToken,
          item_list: input.itemList
        }
      },
      tokenRequired: true
    });
  }

  async getTypingConfig(input: {
    userId: string;
    contextToken: string;
  }): Promise<Record<string, unknown>> {
    return this.requestJson("POST", "ilink/bot/getconfig", {
      payload: {
        ilink_user_id: input.userId,
        context_token: input.contextToken,
        base_info: DEFAULT_BASE_INFO
      },
      tokenRequired: true
    });
  }

  async sendTypingState(input: {
    userId: string;
    typingTicket: string;
    cancel?: boolean;
  }): Promise<Record<string, unknown>> {
    return this.requestJson("POST", "ilink/bot/sendtyping", {
      payload: {
        ilink_user_id: input.userId,
        typing_ticket: input.typingTicket,
        status: input.cancel ? 2 : 1,
        base_info: DEFAULT_BASE_INFO
      },
      tokenRequired: true
    });
  }

  async requestJson<T extends Record<string, unknown>>(
    method: "GET" | "POST",
    endpoint: string,
    options: {
      params?: Record<string, string>;
      payload?: Record<string, unknown>;
      tokenRequired?: boolean;
      timeoutMs?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      AuthorizationType: "ilink_bot_token",
      "X-WECHAT-UIN": btoa(String(randomUint32())),
      ...options.headers
    };
    if (options.tokenRequired && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.apiTimeoutMs);
    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === "POST" ? JSON.stringify(options.payload ?? {}) : undefined,
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${method} ${endpoint} failed: ${response.status} ${text}`);
      }
      return text ? (JSON.parse(text) as T) : ({} as T);
    } finally {
      clearTimeout(timeout);
    }
  }

  buildCdnDownloadUrl(encryptedQueryParam: string): string {
    const url = new URL(`${this.cdnBaseUrl}/download`);
    url.searchParams.set("encrypted_query_param", encryptedQueryParam);
    return url.toString();
  }
}

function randomUint32(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 0;
}

export function isSuccessfulWeixinOcPayload(payload: Record<string, unknown>): boolean {
  return Number(payload.ret ?? 0) === 0 && Number(payload.errcode ?? 0) === 0;
}

export function formatWeixinOcApiError(payload: Record<string, unknown>): string {
  return `ret=${Number(payload.ret ?? 0)}, errcode=${Number(payload.errcode ?? 0)}, errmsg=${String(payload.errmsg ?? "")}`;
}

export function weixinOcApiErrcode(payload: Record<string, unknown>): number {
  return Number(payload.errcode ?? 0);
}
