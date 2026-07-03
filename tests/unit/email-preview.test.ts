import { describe, expect, it } from "vitest";
import { emailAttachmentPreviewKind, isTextEmailMime } from "../../src/tools/email/preview";

describe("email attachment preview classification", () => {
  it("classifies MIME types case-insensitively", () => {
    expect(isTextEmailMime("TEXT/PLAIN")).toBe(true);
    expect(isTextEmailMime("Application/LD+JSON")).toBe(true);
    expect(emailAttachmentPreviewKind("IMAGE/JPEG")).toBe("image");
    expect(emailAttachmentPreviewKind("Application/PDF")).toBe("pdf");
  });

  it("ignores optional MIME parameters", () => {
    expect(isTextEmailMime("text/plain; charset=utf-8")).toBe(true);
    expect(emailAttachmentPreviewKind("application/pdf; name=report.pdf")).toBe("pdf");
  });
});
