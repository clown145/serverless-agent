import PostalMime from "postal-mime";
import { createId } from "../../shared/ids";
import type { EmailAddress } from "../../storage/repositories/email-message-types";
import type { NormalizedEmail, NormalizedEmailAttachment } from "./types";

type PostalAddress = {
  name?: string;
  address?: string;
};

type PostalAttachment = {
  filename?: string;
  mimeType?: string;
  contentType?: string;
  content?: ArrayBuffer | Uint8Array | string;
  contentId?: string;
  disposition?: string;
  related?: boolean;
};

type PostalEmail = {
  messageId?: string;
  from?: PostalAddress;
  to?: PostalAddress[];
  cc?: PostalAddress[];
  bcc?: PostalAddress[];
  replyTo?: PostalAddress[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: Array<{ key: string; value: string }> | Map<string, string> | Record<string, string>;
  attachments?: PostalAttachment[];
};

export async function parseRawEmail(
  raw: ReadableStream<Uint8Array> | ArrayBuffer | string
): Promise<{
  email: NormalizedEmail;
  rawBytes: Uint8Array;
}> {
  const rawBytes = await rawToBytes(raw);
  const parsed = (await PostalMime.parse(rawEmailForParser(rawBytes))) as PostalEmail;
  const headers = normalizeHeaders(parsed.headers);
  const rfcMessageId = parsed.messageId || header(headers, "message-id") || createId("mailmsg");
  const references = splitReferences(header(headers, "references"));
  const inReplyTo = header(headers, "in-reply-to");
  const threadKey = await createThreadKey(references, inReplyTo, rfcMessageId);

  return {
    rawBytes,
    email: {
      rfcMessageId,
      from: normalizeAddress(parsed.from) ?? { address: "unknown@example.invalid" },
      to: normalizeAddresses(parsed.to),
      cc: normalizeAddresses(parsed.cc),
      bcc: normalizeAddresses(parsed.bcc),
      replyTo: normalizeAddresses(parsed.replyTo),
      subject: parsed.subject,
      text: parsed.text,
      html: parsed.html,
      headers,
      inReplyTo,
      references,
      threadKey,
      attachments: normalizeAttachments(parsed.attachments)
    }
  };
}

export function createEmailSnippet(input: {
  subject?: string;
  text?: string;
  html?: string;
}): string {
  const base = input.text || stripHtml(input.html ?? "");
  const compact = base.replace(/\s+/g, " ").trim();
  return compact.slice(0, 240) || input.subject?.slice(0, 240) || "";
}

export async function createThreadKey(
  references: string[],
  inReplyTo: string | undefined,
  messageId: string
): Promise<string> {
  const seed = references[0] ?? inReplyTo ?? messageId;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeAttachments(
  attachments: PostalAttachment[] | undefined
): NormalizedEmailAttachment[] {
  return (attachments ?? [])
    .filter((attachment) => !attachment.related)
    .map((attachment) => {
      const bytes = contentToBytes(attachment.content);
      return {
        id: createId("att"),
        fileName: attachment.filename,
        mimeType: attachment.mimeType ?? attachment.contentType,
        size: bytes.byteLength,
        bytes,
        contentId: attachment.contentId,
        disposition: attachment.disposition
      };
    });
}

function contentToBytes(content: PostalAttachment["content"]): Uint8Array {
  if (!content) {
    return new Uint8Array();
  }
  if (typeof content === "string") {
    return new TextEncoder().encode(content);
  }
  if (content instanceof Uint8Array) {
    return content;
  }
  return new Uint8Array(content);
}

function normalizeHeaders(headers: PostalEmail["headers"]): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Map) {
    return Object.fromEntries(
      Array.from(headers.entries()).map(([key, value]) => [key.toLowerCase(), value])
    );
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map((item) => [item.key.toLowerCase(), item.value]));
  }
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
}

function header(headers: Record<string, string>, name: string): string | undefined {
  return headers[name.toLowerCase()]?.trim() || undefined;
}

function splitReferences(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAddresses(addresses: PostalAddress[] | undefined): EmailAddress[] {
  return (addresses ?? [])
    .map(normalizeAddress)
    .filter((item): item is EmailAddress => Boolean(item));
}

function normalizeAddress(address: PostalAddress | undefined): EmailAddress | undefined {
  if (!address?.address?.trim()) {
    return undefined;
  }
  return {
    address: address.address.trim(),
    name: address.name?.trim() || undefined
  };
}

async function rawToBytes(
  raw: ReadableStream<Uint8Array> | ArrayBuffer | string
): Promise<Uint8Array> {
  if (typeof raw === "string") {
    return new TextEncoder().encode(raw);
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  const response = new Response(raw);
  return new Uint8Array(await response.arrayBuffer());
}

function rawEmailForParser(bytes: Uint8Array): Uint8Array | ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer;
  }
  return bytes;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}
