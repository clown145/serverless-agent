import type { Platform } from "../../shared/types/internal-message";

export type OutboundFile = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

export type OutboundCallbackAction = "agent.message" | "pending.confirm" | "pending.reject";

export type OutboundCallbackButton = {
  kind: "callback";
  label: string;
  action: OutboundCallbackAction;
  payload?: Record<string, unknown>;
  reuse?: boolean;
  answerText?: string;
  showAlert?: boolean;
  removeKeyboardOnClick?: boolean;
  editMessageText?: string;
  silent?: boolean;
};

export type OutboundUrlButton = {
  kind: "url";
  label: string;
  url: string;
};

export type OutboundWebAppButton = {
  kind: "web_app";
  label: string;
  url: string;
};

export type OutboundCopyTextButton = {
  kind: "copy_text";
  label: string;
  copyText: string;
};

export type OutboundButton =
  | OutboundCallbackButton
  | OutboundUrlButton
  | OutboundWebAppButton
  | OutboundCopyTextButton;

export type OutboundButtonRow = OutboundButton[];

export type ButtonLayout = {
  columns?: number;
};

export type PlatformActivityType = "typing" | "upload_photo" | "upload_document";

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
  buttons?: OutboundButton[];
  rows?: OutboundButtonRow[];
  layout?: ButtonLayout;
  expiresInSeconds?: number;
};

export type SendActivityInput = {
  agentId: string;
  conversationId: string;
  activity: PlatformActivityType;
};

export type PlatformOutboundAdapter = {
  platform: Platform;
  sendText?: (input: SendTextInput) => Promise<PlatformSendResult>;
  sendFile?: (input: SendFileInput) => Promise<PlatformSendResult>;
  sendImage?: (input: SendImageInput) => Promise<PlatformSendResult>;
  sendButtons?: (input: SendButtonsInput) => Promise<PlatformSendResult>;
  sendActivity?: (input: SendActivityInput) => Promise<PlatformSendResult>;
};
