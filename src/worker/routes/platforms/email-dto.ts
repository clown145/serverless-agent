import { parseEmailIntegrationConfig } from "../../../adapters/email/config";
import type { EmailMessageRecord } from "../../../storage/repositories/email-message-types";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";

export function toEmailIntegrationDto(integration: PlatformIntegrationRecord) {
  const config = parseEmailIntegrationConfig(integration);
  return {
    id: integration.id,
    agentId: integration.agentId,
    name: integration.name,
    platform: integration.platform,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    replyTo: config.replyTo,
    inboundAddresses: config.inboundAddresses,
    hasResendApiKey: Boolean(integration.credentialId),
    status: integration.status,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
}

export function toEmailMessageDto(message: EmailMessageRecord) {
  return {
    id: message.id,
    agentId: message.agentId,
    integrationId: message.integrationId,
    internalMessageId: message.internalMessageId,
    direction: message.direction,
    conversationId: message.conversationId,
    threadKey: message.threadKey,
    rfcMessageId: message.rfcMessageId,
    resendMessageId: message.resendMessageId,
    from: message.from,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    replyTo: message.replyTo,
    subject: message.subject,
    snippet: message.snippet,
    textBody: message.textBody,
    htmlBody: message.htmlBody,
    status: message.status,
    error: message.error,
    sentAt: message.sentAt,
    receivedAt: message.receivedAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}
