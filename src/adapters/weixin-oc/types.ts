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

export type WeixinOcImageItem = {
  type: 2;
  image_item: {
    media: WeixinOcMediaRef;
    mid_size: number;
  };
};

export type WeixinOcFileItem = {
  type: 4;
  file_item: {
    media: WeixinOcMediaRef;
    file_name: string;
    len: string;
  };
};

export type WeixinOcSendItem =
  | WeixinOcTextItem
  | WeixinOcImageItem
  | WeixinOcFileItem
  | Record<string, unknown>;

export type WeixinOcMediaUploadKind = "image" | "file";

export type WeixinOcUploadedMedia = {
  filekey: string;
  downloadEncryptedQueryParam: string;
  aesKeyBase64: string;
  plainSize: number;
  ciphertextSize: number;
};

export type WeixinOcGetUploadUrlInput = {
  filekey: string;
  media_type: number;
  to_user_id: string;
  rawsize: number;
  rawfilemd5: string;
  filesize: number;
  thumb_rawsize?: number;
  thumb_rawfilemd5?: string;
  thumb_filesize?: number;
  no_need_thumb?: boolean;
  aeskey: string;
};

export type WeixinOcGetUploadUrlResult = {
  upload_param?: string;
  thumb_upload_param?: string;
  upload_full_url?: string;
};

export type WeixinOcSendResult = {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  message_id?: string;
  msg_id?: string;
};
