export type PlatformCallbackStatus = "active" | "used" | "expired" | "cancelled";

export type PlatformCallbackRecord = {
  id: string;
  agentId: string;
  platform: string;
  conversationId: string;
  action: string;
  payloadJson: string;
  status: PlatformCallbackStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  usedAt?: string;
};

export type PlatformCallbackRow = {
  id: string;
  agent_id: string;
  platform: string;
  conversation_id: string;
  action: string;
  payload_json: string;
  status: PlatformCallbackStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  used_at?: string | null;
};

export function mapPlatformCallbackRow(row: PlatformCallbackRow): PlatformCallbackRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    platform: row.platform,
    conversationId: row.conversation_id,
    action: row.action,
    payloadJson: row.payload_json,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedAt: row.used_at ?? undefined
  };
}
