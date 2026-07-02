import { afterEach, describe, expect, it, vi } from "vitest";
import { sendResendEmail } from "../../src/adapters/email/resend";

describe("Resend email client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends base64 attachments", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "resend_1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const result = await sendResendEmail({
      apiKey: "re_test",
      from: "bot@example.com",
      to: [{ address: "user@example.com" }],
      subject: "Hi",
      text: "Hello",
      attachments: [
        {
          filename: "note.txt",
          contentType: "text/plain",
          bytes: new TextEncoder().encode("hello")
        }
      ]
    });

    expect(result.id).toBe("resend_1");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      attachments: Array<{ content: string; filename: string }>;
    };
    expect(body.attachments[0]).toMatchObject({
      filename: "note.txt",
      content: "aGVsbG8="
    });
  });

  it("maps Resend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 })
    );

    await expect(
      sendResendEmail({
        apiKey: "bad",
        from: "bot@example.com",
        to: [{ address: "user@example.com" }],
        subject: "Hi",
        text: "Hello"
      })
    ).rejects.toThrow("Invalid API key");
  });
});
