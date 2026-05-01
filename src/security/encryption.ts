import { base64ToBytes, bytesToBase64 } from "./base64";

export type EncryptedString = {
  encryptedValue: string;
  iv: string;
  algorithm: "AES-GCM";
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function encryptString(
  plaintext: string,
  masterKey: string
): Promise<EncryptedString> {
  const key = await importAesKey(masterKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plaintext)
  );

  return {
    encryptedValue: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    algorithm: "AES-GCM"
  };
}

export async function decryptString(
  encrypted: EncryptedString,
  masterKey: string
): Promise<string> {
  const key = await importAesKey(masterKey, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encrypted.iv) },
    key,
    base64ToBytes(encrypted.encryptedValue)
  );

  return textDecoder.decode(decrypted);
}

async function importAesKey(
  masterKey: string,
  usages: Array<"encrypt" | "decrypt">
): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(masterKey)
  );

  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, usages);
}
