export type Platform = "telegram" | "qq" | "webhook" | "admin" | "webui";

export type MessageKind = "text" | "command" | "attachment" | "event";

export type SenderRole = "owner" | "admin" | "member" | "unknown";

export type MessageSender = {
  platformUserId: string;
  displayName?: string;
  role: SenderRole;
};

export type MessageAttachment = {
  id: string;
  type: "image" | "file" | "audio" | "video" | "unknown";
  name?: string;
  mimeType?: string;
  size?: number;
  r2Key?: string;
  sourceUrl?: string;
  dataBase64?: string;
};

export type InternalMessage = {
  id: string;
  platform: Platform;
  platformMessageId: string;
  agentId: string;
  conversationId: string;
  sender: MessageSender;
  kind: MessageKind;
  text?: string;
  attachments: MessageAttachment[];
  rawRef?: string;
  scheduleId?: string;
  receivedAt: string;
};
