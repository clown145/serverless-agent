import { bytesToBase64 } from "../../security/base64";
import type { EmailAddress } from "../../storage/repositories/email-message-types";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const MAX_RESEND_EMAIL_BYTES = 40 * 1024 * 1024;

export type ResendAttachmentInput = {
  filename: string;
  contentType?: string;
  bytes?: Uint8Array;
  path?: string;
};

export type ResendSendEmailInput = {
  apiKey: string;
  from: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: ResendAttachmentInput[];
};

export type ResendSendEmailResult = {
  id: string;
};

export async function sendResendEmail(input: ResendSendEmailInput): Promise<ResendSendEmailResult> {
  const estimatedBytes = estimatePayloadBytes(input);
  if (estimatedBytes > MAX_RESEND_EMAIL_BYTES) {
    throw new Error("Email payload exceeds Resend's 40MB limit after base64 encoding");
  }

  const payload = createResendPayload(input);

  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string | { message?: string };
  };

  if (!response.ok || !body.id) {
    throw new Error(errorMessage(body) || `Resend send failed: ${response.status}`);
  }

  return { id: body.id };
}

function createResendPayload(input: ResendSendEmailInput): Record<string, unknown> {
  return {
    from: input.from,
    to: input.to.map(formatAddress),
    cc: input.cc?.length ? input.cc.map(formatAddress) : undefined,
    bcc: input.bcc?.length ? input.bcc.map(formatAddress) : undefined,
    reply_to: input.replyTo?.length ? input.replyTo.map(formatAddress) : undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.bytes ? bytesToBase64(attachment.bytes) : undefined,
      path: attachment.path,
      content_type: attachment.contentType
    }))
  };
}

export function formatAddress(address: EmailAddress): string {
  if (!address.name?.trim()) {
    return address.address;
  }
  return `"${address.name.replace(/"/g, '\\"')}" <${address.address}>`;
}

function estimatePayloadBytes(input: ResendSendEmailInput): number {
  const encoder = new TextEncoder();
  let size = 512;

  size += encodedSize(encoder, input.from);
  size += encodedSize(encoder, input.subject);
  size += encodedSize(encoder, input.text);
  size += encodedSize(encoder, input.html);
  size += addressListSize(encoder, input.to);
  size += addressListSize(encoder, input.cc);
  size += addressListSize(encoder, input.bcc);
  size += addressListSize(encoder, input.replyTo);

  for (const [key, value] of Object.entries(input.headers ?? {})) {
    size += encodedSize(encoder, key) + encodedSize(encoder, value) + 8;
  }

  for (const attachment of input.attachments ?? []) {
    size += 128;
    size += encodedSize(encoder, attachment.filename);
    size += encodedSize(encoder, attachment.contentType);
    size += encodedSize(encoder, attachment.path);
    if (attachment.bytes) {
      size += base64EncodedSize(attachment.bytes.byteLength);
    }
  }

  return size;
}

function addressListSize(encoder: TextEncoder, addresses: EmailAddress[] | undefined): number {
  return (addresses ?? []).reduce(
    (sum, address) => sum + encodedSize(encoder, formatAddress(address)) + 8,
    0
  );
}

function encodedSize(encoder: TextEncoder, value: string | undefined): number {
  return value ? encoder.encode(value).byteLength : 0;
}

function base64EncodedSize(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4;
}

function errorMessage(body: { message?: string; error?: string | { message?: string } }): string {
  if (body.message) {
    return body.message;
  }
  if (typeof body.error === "string") {
    return body.error;
  }
  return body.error?.message ?? "";
}
