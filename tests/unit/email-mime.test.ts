import { describe, expect, it } from "vitest";
import { parseRawEmail } from "../../src/adapters/email/mime";

describe("email MIME parsing", () => {
  it("parses text, html, headers, and attachments", async () => {
    const boundary = "test-boundary";
    const raw = [
      "Message-ID: <msg-1@example.com>",
      "From: Alice <alice@example.com>",
      "To: Bot <bot@example.com>",
      "Subject: Hello",
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Plain body",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>HTML body</p>",
      `--${boundary}`,
      "Content-Type: text/plain; name=\"note.txt\"",
      "Content-Disposition: attachment; filename=\"note.txt\"",
      "",
      "attached text",
      `--${boundary}--`,
      ""
    ].join("\r\n");

    const { email, rawBytes } = await parseRawEmail(raw);

    expect(rawBytes.byteLength).toBeGreaterThan(0);
    expect(email.rfcMessageId).toBe("<msg-1@example.com>");
    expect(email.from.address).toBe("alice@example.com");
    expect(email.to[0]?.address).toBe("bot@example.com");
    expect(email.subject).toBe("Hello");
    expect(email.text).toContain("Plain body");
    expect(email.html).toContain("HTML body");
    expect(email.attachments[0]).toMatchObject({
      fileName: "note.txt",
      mimeType: "text/plain"
    });
  });
});
