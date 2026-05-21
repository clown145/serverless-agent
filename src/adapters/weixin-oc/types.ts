export type WeixinOcApiConfig = {
  baseUrl: string;
  cdnBaseUrl: string;
  apiTimeoutMs: number;
  token?: string;
};

export type WeixinOcLoginSession = {
  sessionKey: string;
  qrcode: string;
  qrcodeImgContent: string;
  startedAt: string;
  status: "wait" | "scanned" | "confirmed" | "expired" | string;
  botToken?: string;
  accountId?: string;
  baseUrl?: string;
  userId?: string;
  error?: string;
};

export type WeixinOcAccountState = {
  token?: string;
  accountId?: string;
  syncBuf?: string;
  baseUrl?: string;
  contextTokens: Record<string, string>;
};

export type WeixinOcMessageItem = {
  type?: number;
  text_item?: {
    text?: string;
  };
  voice_item?: {
    text?: string;
    media?: WeixinOcMediaRef;
  };
  image_item?: {
    media?: WeixinOcMediaRef;
    aeskey?: string;
    mid_size?: number;
  };
  video_item?: {
    media?: WeixinOcMediaRef;
    video_size?: number;
  };
  file_item?: {
    media?: WeixinOcMediaRef;
    file_name?: string;
    len?: string;
  };
  ref_msg?: unknown;
};

export type WeixinOcMediaRef = {
  encrypt_query_param?: string;
  aes_key?: string;
  encrypt_type?: number;
};

export type WeixinOcInboundMessage = {
  message_id?: string;
  msg_id?: string;
  from_user_id?: string;
  context_token?: string;
  create_time?: number;
  create_time_ms?: number;
  item_list?: WeixinOcMessageItem[];
};

export type WeixinOcUpdatesResponse = {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  get_updates_buf?: string;
  msgs?: WeixinOcInboundMessage[];
};

export type WeixinOcTextItem = {
  type: 1;
  text_item: {
    text: string;
  };
};

export type WeixinOcSendItem = WeixinOcTextItem | Record<string, unknown>;

export type WeixinOcSendResult = {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  message_id?: string;
  msg_id?: string;
};

