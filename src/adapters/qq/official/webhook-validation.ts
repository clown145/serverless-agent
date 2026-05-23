const ED25519_PKCS8_SEED_PREFIX = "302e020100300506032b657004220420";

export type QqOfficialWebhookValidationPayload = {
  plain_token?: string;
  event_ts?: string;
};

export async function createQqOfficialWebhookValidationResponse(
  secret: string,
  payload: QqOfficialWebhookValidationPayload
): Promise<{ plain_token: string; signature: string }> {
  const plainToken = payload.plain_token ?? "";
  const eventTs = payload.event_ts ?? "";
  const signature = await signQqOfficialWebhookValidation(secret, eventTs + plainToken);
  return {
    plain_token: plainToken,
    signature
  };
}

export async function signQqOfficialWebhookValidation(
  secret: string,
  message: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    qqOfficialEd25519Pkcs8Seed(secret),
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    new TextEncoder().encode(message)
  );
  return bytesToHex(new Uint8Array(signature));
}

function qqOfficialEd25519Pkcs8Seed(secret: string): Uint8Array {
  const seed = repeatSecretSeed(secret);
  const prefix = hexToBytes(ED25519_PKCS8_SEED_PREFIX);
  const bytes = new Uint8Array(prefix.length + seed.length);
  bytes.set(prefix, 0);
  bytes.set(seed, prefix.length);
  return bytes;
}

function repeatSecretSeed(secret: string): Uint8Array {
  const encoder = new TextEncoder();
  let value = secret;
  if (encoder.encode(value).length === 0) {
    throw new Error("QQ official secret is required for webhook validation");
  }
  while (encoder.encode(value).length < 32) {
    value += secret;
  }
  return encoder.encode(value).slice(0, 32);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
