import { describe, expect, it } from "vitest";
import { isBlockedHostname, validateFetchUrl } from "../../src/tools/http/url-safety";

describe("HTTP URL safety", () => {
  it("allows public HTTP and HTTPS URLs", () => {
    expect(validateFetchUrl("https://api.example.com/v1/items")).toBeUndefined();
    expect(validateFetchUrl("http://example.com/status")).toBeUndefined();
  });

  it("blocks local and private IPv4 hosts", () => {
    expect(validateFetchUrl("http://localhost/admin")).toContain("Local");
    expect(validateFetchUrl("http://127.0.0.1/admin")).toContain("Local");
    expect(validateFetchUrl("http://10.1.2.3/admin")).toContain("Local");
    expect(validateFetchUrl("http://172.16.1.1/admin")).toContain("Local");
    expect(validateFetchUrl("http://192.168.1.1/admin")).toContain("Local");
  });

  it("blocks normalized IPv4 literals", () => {
    expect(validateFetchUrl("http://2130706433/admin")).toContain("Local");
    expect(validateFetchUrl("http://0x7f000001/admin")).toContain("Local");
    expect(validateFetchUrl("http://0177.0.0.1/admin")).toContain("Local");
  });

  it("blocks IPv6 loopback, local, link-local, and mapped private addresses", () => {
    expect(isBlockedHostname("[::1]")).toBe(true);
    expect(isBlockedHostname("[fc00::1]")).toBe(true);
    expect(isBlockedHostname("[fd12::1]")).toBe(true);
    expect(isBlockedHostname("[fe80::1]")).toBe(true);
    expect(isBlockedHostname("[::ffff:7f00:1]")).toBe(true);
    expect(isBlockedHostname("[64:ff9b::c0a8:0101]")).toBe(true);
  });
});
