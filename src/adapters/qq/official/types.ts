export const QQ_OFFICIAL_API_BASE_URL = "https://api.sgroup.qq.com";
export const QQ_OFFICIAL_SANDBOX_API_BASE_URL = "https://sandbox.api.sgroup.qq.com";
export const QQ_OFFICIAL_AUTH_BASE_URL = "https://bots.qq.com";

export const QQ_OPCODE = {
  dispatch: 0,
  heartbeat: 1,
  identify: 2,
  resume: 6,
  reconnect: 7,
  invalidSession: 9,
  hello: 10,
  heartbeatAck: 11
} as const;

export type QqOfficialGatewayIntent = number;

export type QqOfficialAccessToken = {
  accessToken: string;
  expiresAt: number;
};

export type QqOfficialGatewayInfo = {
  url: string;
  shards: number;
  sessionStartLimit: {
    total?: number;
    remaining: number;
    resetAfter?: number;
    maxConcurrency: number;
  };
};

export type QqOfficialSessionState = {
  sessionId?: string;
  lastSeq?: number;
  shardId: number;
  shardCount: number;
  status: "idle" | "connecting" | "connected" | "resuming" | "closed" | "error";
  lastReadyAt?: string;
  lastHeartbeatAt?: string;
  lastHeartbeatAckAt?: string;
  lastError?: string;
};

export type QqOfficialGatewayPayload<T = unknown> = {
  op: number;
  s?: number;
  t?: string;
  d?: T;
};

export type QqOfficialReadyPayload = {
  version?: number;
  session_id: string;
  shard: [number, number];
  user?: {
    id?: string;
    username?: string;
    bot?: boolean;
  };
};

export type QqOfficialAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  url?: string;
};

export type QqOfficialAuthor = {
  id?: string;
  username?: string;
  user_openid?: string;
  member_openid?: string;
};

export type QqOfficialMessagePayload = {
  id: string;
  content?: string;
  timestamp?: string;
  author?: QqOfficialAuthor;
  attachments?: QqOfficialAttachment[];
  mentions?: Array<{ id?: string; username?: string }>;
  channel_id?: string;
  guild_id?: string;
  group_openid?: string;
  event_id?: string;
};

export type QqOfficialEventType =
  | "AT_MESSAGE_CREATE"
  | "GROUP_AT_MESSAGE_CREATE"
  | "DIRECT_MESSAGE_CREATE"
  | "C2C_MESSAGE_CREATE"
  | string;

export type QqOfficialSendTarget =
  | {
      kind: "group";
      groupOpenId: string;
    }
  | {
      kind: "c2c";
      openId: string;
    }
  | {
      kind: "channel";
      channelId: string;
    }
  | {
      kind: "direct";
      guildId: string;
    };

export type QqOfficialMessageSendResponse = {
  id?: string;
};

export type QqOfficialMarkdownPayload = {
  content: string;
};

export type QqOfficialFileUploadResponse = {
  file_uuid: string;
  file_info: string;
  ttl?: number;
};

export type QqOfficialMedia = {
  file_uuid: string;
  file_info: string;
  ttl?: number;
};
