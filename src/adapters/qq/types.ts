export type QqEnvironment = "sandbox" | "production";

export type QqCredential = {
  appId: string;
  appSecret: string;
};

export type QqIntegrationConfig = {
  environment?: QqEnvironment;
  eventMode?: "webhook";
};

export type QqPayload<T = unknown> = {
  id?: string;
  op: number;
  d?: T;
  s?: number;
  t?: string;
};

export type QqValidationRequest = {
  plain_token: string;
  event_ts: string;
};

export type QqValidationResponse = {
  plain_token: string;
  signature: string;
};

export type QqAttachment = {
  content_type?: string;
  filename?: string;
  height?: number;
  width?: number;
  size?: number;
  url?: string;
  voice_wav_url?: string;
  asr_refer_text?: string;
};

export type QqC2cMessage = {
  id: string;
  author?: { user_openid?: string };
  content?: string;
  timestamp?: string;
  attachments?: QqAttachment[];
};

export type QqGroupAtMessage = {
  id: string;
  author?: { member_openid?: string };
  content?: string;
  group_openid?: string;
  timestamp?: string;
  attachments?: QqAttachment[];
};

export type QqGuildAuthor = {
  id?: string;
  username?: string;
  bot?: boolean;
};

export type QqGuildMessage = {
  id: string;
  author?: QqGuildAuthor;
  content?: string;
  channel_id?: string;
  guild_id?: string;
  timestamp?: string;
  attachments?: QqAttachment[];
  seq?: number;
};

export type QqAccessTokenResponse = {
  access_token: string;
  expires_in: number | string;
};

export type QqApiErrorResponse = {
  code?: number;
  message?: string;
  trace_id?: string;
};

export type QqSendMessageResponse = {
  id?: string;
  timestamp?: number | string;
};
