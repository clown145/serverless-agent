import { describe, expect, it } from "vitest";
import {
  aes128EcbPaddedSize,
  decryptAes128Block,
  decryptAes128EcbPkcs7,
  encryptAes128Block,
  encryptAes128EcbPkcs7
} from "../../src/security/aes-ecb";

describe("AES-128 ECB", () => {
  it("encrypts a standard AES-128 block vector", () => {
    const key = bytes("000102030405060708090a0b0c0d0e0f");
    const plaintext = bytes("00112233445566778899aabbccddeeff");
    const ciphertext = encryptAes128Block(plaintext, key);

    expect(hex(ciphertext)).toBe("69c4e0d86a7b0430d8cdb78070b4c55a");
    expect(hex(decryptAes128Block(ciphertext, key))).toBe(hex(plaintext));
  });

  it("uses PKCS#7 padding for ECB payloads", () => {
    expect(
      hex(encryptAes128EcbPkcs7(new Uint8Array(), bytes("000102030405060708090a0b0c0d0e0f")))
    ).toBe("954f64f2e4e86e9eee82d20216684899");
    expect(aes128EcbPaddedSize(0)).toBe(16);
    expect(aes128EcbPaddedSize(16)).toBe(32);
    expect(aes128EcbPaddedSize(17)).toBe(32);
  });

  it("decrypts PKCS#7 padded ECB payloads", () => {
    const key = bytes("000102030405060708090a0b0c0d0e0f");
    const plaintext = new TextEncoder().encode("hello weixin image");
    const ciphertext = encryptAes128EcbPkcs7(plaintext, key);

    expect(new TextDecoder().decode(decryptAes128EcbPkcs7(ciphertext, key))).toBe(
      "hello weixin image"
    );
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
