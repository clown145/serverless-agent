import { bytesToBase64, base64ToBytes } from "../../security/base64";
import type { BlobObject } from "./types";

export function bytesFromBlobValue(value: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  return value;
}

export function blobObjectFromBytes(input: {
  key: string;
  bytes: Uint8Array;
  contentType?: string;
}): BlobObject {
  return {
    key: input.key,
    size: input.bytes.byteLength,
    contentType: input.contentType,
    body: new Response(input.bytes).body ?? new ReadableStream<Uint8Array>(),
    async arrayBuffer() {
      return input.bytes.buffer.slice(
        input.bytes.byteOffset,
        input.bytes.byteOffset + input.bytes.byteLength
      ) as ArrayBuffer;
    },
    async text() {
      return new TextDecoder().decode(input.bytes);
    }
  };
}

export function base64FromBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

export function bytesFromBase64(value: string): Uint8Array {
  return base64ToBytes(value);
}
