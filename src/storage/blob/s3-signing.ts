import { bytesToHex } from "../../security/base64";

const encoder = new TextEncoder();

export type S3PresignInput = {
  method: "GET" | "PUT" | "HEAD" | "DELETE";
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  expiresSeconds?: number;
  contentType?: string;
};

export async function presignS3Url(input: S3PresignInput): Promise<string> {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = new URL(input.endpoint);
  const { host, pathname } = s3HostAndPath(endpoint, input.bucket, input.key, input.forcePathStyle);
  const credentialScope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const credential = `${input.accessKeyId}/${credentialScope}`;
  const signedHeaders = "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresSeconds ?? 300),
    "X-Amz-SignedHeaders": signedHeaders
  });

  const canonicalQuery = canonicalQueryString(query);
  const canonicalRequest = [
    input.method,
    pathname,
    canonicalQuery,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await s3SigningKey(input.secretAccessKey, dateStamp, input.region);
  const signature = bytesToHex(
    new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, encoder.encode(stringToSign)))
  );
  query.set("X-Amz-Signature", signature);

  return `${endpoint.protocol}//${host}${pathname}?${canonicalQueryString(query)}`;
}

function s3HostAndPath(
  endpoint: URL,
  bucket: string,
  key: string,
  forcePathStyle: boolean
): { host: string; pathname: string } {
  const basePath = endpoint.pathname.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  if (forcePathStyle) {
    return {
      host: endpoint.host,
      pathname: `${basePath}/${encodeURIComponent(bucket)}/${encodedKey}`.replace(/\/+/g, "/")
    };
  }

  return {
    host: `${bucket}.${endpoint.host}`,
    pathname: `${basePath}/${encodedKey}`.replace(/\/+/g, "/")
  };
}

function canonicalQueryString(query: URLSearchParams): string {
  return Array.from(query.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function s3SigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string
): Promise<CryptoKey> {
  const dateKey = await hmacRaw(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmacRaw(dateKey, region);
  const serviceKey = await hmacRaw(regionKey, "s3");
  const signingKey = await hmacRaw(serviceKey, "aws4_request");
  return crypto.subtle.importKey("raw", signingKey, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign"
  ]);
}

async function hmacRaw(keyBytes: Uint8Array, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return new Uint8Array(signature);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
