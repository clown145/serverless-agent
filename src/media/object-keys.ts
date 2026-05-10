export function buildAttachmentObjectKey(input: {
  agentId: string;
  messageId: string;
  attachmentId: string;
}): string {
  return `attachments/${encodeURIComponent(input.agentId)}/${encodeURIComponent(input.messageId)}/${encodeURIComponent(input.attachmentId)}`;
}
