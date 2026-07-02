import { resolveEmailIntegrationByInboundAddress } from "../adapters/email/config";
import { parseRawEmail, createEmailSnippet } from "../adapters/email/mime";
import { normalizeEmailToInternalMessage } from "../adapters/email/normalize";
import { buildEmailRawObjectKey } from "../adapters/email/object-keys";
import { persistInboundAttachments } from "../media/persist-attachments";
import { createBlobStorage } from "../storage/blob";
import { createEmailMessageRecord } from "../storage/repositories/email-messages-repository";
import type { Env } from "../shared/types/env";
import { createId } from "../shared/ids";
import { nowIso } from "../shared/time";
import type { QueueMessageBody } from "../shared/types/queue";

type WorkerEmailMessage = {
  from: string;
  to: string;
  raw: ReadableStream<Uint8Array>;
  rawSize?: number;
  setReject?: (reason: string) => void;
};

export async function handleInboundEmail(
  message: WorkerEmailMessage,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const resolved = await resolveEmailIntegrationByInboundAddress(env, message.to);
  if (!resolved) {
    message.setReject?.("No email integration is configured for this recipient");
    return;
  }

  const receivedAt = nowIso();
  const { email, rawBytes } = await parseRawEmail(message.raw);
  const internalMessage = normalizeEmailToInternalMessage({
    agentId: resolved.integration.agentId,
    integrationId: resolved.integration.id,
    email,
    receivedAt
  });
  const emailMessageId = createId("email");
  const rawR2Key = buildEmailRawObjectKey({
    agentId: resolved.integration.agentId,
    integrationId: resolved.integration.id,
    emailMessageId
  });

  await createBlobStorage(env).put(rawR2Key, rawBytes, { contentType: "message/rfc822" });
  const persistedMessage = await persistInboundAttachments(env, internalMessage);

  await createEmailMessageRecord(env.AGENT_DB, {
    id: emailMessageId,
    agentId: resolved.integration.agentId,
    integrationId: resolved.integration.id,
    internalMessageId: persistedMessage.id,
    direction: "inbound",
    conversationId: persistedMessage.conversationId,
    threadKey: email.threadKey,
    rfcMessageId: email.rfcMessageId,
    inReplyTo: email.inReplyTo,
    references: email.references,
    from: email.from,
    to: email.to,
    cc: email.cc,
    bcc: email.bcc,
    replyTo: email.replyTo,
    subject: email.subject,
    snippet: createEmailSnippet({ subject: email.subject, text: email.text, html: email.html }),
    textBody: email.text,
    htmlBody: email.html,
    headers: email.headers,
    rawR2Key,
    status: "received",
    receivedAt
  });

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId: resolved.integration.agentId,
    message: persistedMessage,
    receivedAt
  };
  await env.AGENT_QUEUE.send(job);
}
