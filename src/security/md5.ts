import { bytesToHex } from "./base64";

const SHIFT_AMOUNTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
] as const;

const TABLE = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0
);

export function md5Hex(bytes: Uint8Array): string {
  const padded = padMd5Input(bytes);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = blockWords(padded, offset);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const nextD = c;
      c = b;
      b = add32(
        b,
        rotateLeft32(add32(add32(a, f), add32(TABLE[index] ?? 0, words[g] ?? 0)), SHIFT_AMOUNTS[index] ?? 0)
      );
      a = d;
      d = nextD;
    }

    a0 = add32(a0, a);
    b0 = add32(b0, b);
    c0 = add32(c0, c);
    d0 = add32(d0, d);
  }

  return bytesToHex(wordsToBytes([a0, b0, c0, d0]));
}

function padMd5Input(bytes: Uint8Array): Uint8Array {
  const originalBitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  let length = originalBitLength;
  for (let index = 0; index < 8; index += 1) {
    padded[paddedLength - 8 + index] = length & 0xff;
    length = Math.floor(length / 256);
  }
  return padded;
}

function blockWords(bytes: Uint8Array, offset: number): number[] {
  return Array.from({ length: 16 }, (_, index) => {
    const start = offset + index * 4;
    return (
      (bytes[start] ?? 0) |
      ((bytes[start + 1] ?? 0) << 8) |
      ((bytes[start + 2] ?? 0) << 16) |
      ((bytes[start + 3] ?? 0) << 24)
    ) >>> 0;
  });
}

function wordsToBytes(words: number[]): Uint8Array {
  const bytes = new Uint8Array(words.length * 4);
  words.forEach((word, index) => {
    const offset = index * 4;
    bytes[offset] = word & 0xff;
    bytes[offset + 1] = (word >>> 8) & 0xff;
    bytes[offset + 2] = (word >>> 16) & 0xff;
    bytes[offset + 3] = (word >>> 24) & 0xff;
  });
  return bytes;
}

function rotateLeft32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function add32(left: number, right: number): number {
  return (left + right) >>> 0;
}
