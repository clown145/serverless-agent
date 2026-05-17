import { getPublicKeyAsync, signAsync } from "@noble/ed25519";
import type { QqValidationRequest, QqValidationResponse } from "./types";

export async function createQqValidationResponse(
  request: QqValidationRequest,
  appSecret: string
): Promise<QqValidationResponse> {
  const privateKey = qqSeedFromSecret(appSecret);
  const message = new TextEncoder().encode(`${request.event_ts}${request.plain_token}`);
  const signature = await signAsync(message, privateKey);

  return {
    plain_token: request.plain_token,
    signature: bytesToHex(signature)
  };
}

function qqSeedFromSecret(appSecret: string): Uint8Array {
  let seed = appSecret;
  while (seed.length < 32) {
    seed += seed;
  }
  seed = seed.slice(0, 32);
  return new TextEncoder().encode(seed);
}

export async function createQqValidationPublicKey(appSecret: string): Promise<string> {
  return bytesToHex(await getPublicKeyAsync(qqSeedFromSecret(appSecret)));
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
