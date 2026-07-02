import type { EmailAddress } from "../../storage/repositories/email-message-types";
import type { PlatformIntegrationRecord } from "../../storage/repositories/platform-integration-types";

export type EmailIntegrationConfig = {
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  inboundAddresses: string[];
};

export type ResolvedEmailIntegration = {
  integration: PlatformIntegrationRecord;
  config: EmailIntegrationConfig;
  resendApiKey: string;
};

export type NormalizedEmailAttachment = {
  id: string;
  fileName?: string;
  mimeType?: string;
  size: number;
  bytes: Uint8Array;
  contentId?: string;
  disposition?: string;
};

export type NormalizedEmail = {
  rfcMessageId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  subject?: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  inReplyTo?: string;
  references: string[];
  threadKey: string;
  attachments: NormalizedEmailAttachment[];
};
