import { describe, expect, it } from "vitest";
import {
  aes128EcbPaddedSize,
  encryptAes128Block,
  encryptAes128EcbPkcs7
} from "../../src/security/aes-ecb";

describe("AES-128 ECB", () => {
  it("encrypts a standard AES-128 block vector", () => {
    expect(
      hex(
        encryptAes128Block(
          bytes("00112233445566778899aabbccddeeff"),
          bytes("000102030405060708090a0b0c0d0e0f")
        )
      )
    ).toBe("69c4e0d86a7b0430d8cdb78070b4c55a");
  });

  it("uses PKCS#7 padding for ECB payloads", () => {
    expect(
      hex(encryptAes128EcbPkcs7(new Uint8Array(), bytes("000102030405060708090a0b0c0d0e0f")))
    ).toBe("954f64f2e4e86e9eee82d20216684899");
    expect(aes128EcbPaddedSize(0)).toBe(16);
    expect(aes128EcbPaddedSize(16)).toBe(32);
    expect(aes128EcbPaddedSize(17)).toBe(32);
  });
});

function bytes(value: string): Uint8Array {
  const result = new Uint8Array(value.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
}

function hex(bytesValue: Uint8Array): string {
  return Array.from(bytesValue, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
