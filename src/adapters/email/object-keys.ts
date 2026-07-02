export function buildEmailRawObjectKey(input: {
  agentId: string;
  integrationId: string;
  emailMessageId: string;
}): string {
  return `email/${encodeURIComponent(input.agentId)}/${encodeURIComponent(
    input.integrationId
  )}/raw/${encodeURIComponent(input.emailMessageId)}.eml`;
}
