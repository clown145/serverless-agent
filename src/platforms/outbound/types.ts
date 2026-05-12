import type { Platform } from "../../shared/types/internal-message";

export type OutboundFile = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

export type OutboundButton = {
  label: string;
  action: "agent.message" | "pending.confirm" | "pending.reject";
  payload?: Record<string, unknown>;
};

export type ButtonLayout = {
  columns?: number;
};

export type PlatformSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export type SendTextInput = {
  agentId: string;
  conversationId: string;
  text: string;
};

export type SendFileInput = {
  agentId: string;
  conversationId: string;
  file: OutboundFile;
  caption?: string;
};

export type SendImageInput = {
  agentId: string;
  conversationId: string;
  file: OutboundFile;
  caption?: string;
};

export type SendButtonsInput = {
  agentId: string;
  conversationId: string;
  text: string;
  buttons: OutboundButton[];
  layout?: ButtonLayout;
  expiresInSeconds?: number;
};

export type PlatformOutboundAdapter = {
  platform: Platform;
  sendText?: (input: SendTextInput) => Promise<PlatformSendResult>;
  sendFile?: (input: SendFileInput) => Promise<PlatformSendResult>;
  sendImage?: (input: SendImageInput) => Promise<PlatformSendResult>;
  sendButtons?: (input: SendButtonsInput) => Promise<PlatformSendResult>;
};
