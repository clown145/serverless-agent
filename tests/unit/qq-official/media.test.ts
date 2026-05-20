import { describe, expect, it } from "vitest";
import {
  QQ_OFFICIAL_FILE_TYPE,
  qqOfficialFileDataBase64,
  qqOfficialFileType
} from "../../../src/adapters/qq/official/media";

describe("QQ official media helpers", () => {
  it("maps MIME types to QQ file types", () => {
    expect(fileType("image/png")).toBe(QQ_OFFICIAL_FILE_TYPE.image);
    expect(fileType("video/mp4")).toBe(QQ_OFFICIAL_FILE_TYPE.video);
    expect(fileType("audio/wav")).toBe(QQ_OFFICIAL_FILE_TYPE.audio);
    expect(fileType("application/pdf")).toBe(QQ_OFFICIAL_FILE_TYPE.file);
  });

  it("encodes outbound file bytes as base64", () => {
    expect(
      qqOfficialFileDataBase64({
        bytes: new Uint8Array([105, 109, 103]),
        fileName: "image.png",
        mimeType: "image/png"
      })
    ).toBe("aW1n");
  });
});

function fileType(mimeType: string): number {
  return qqOfficialFileType({
    bytes: new Uint8Array(),
    fileName: "file",
    mimeType
  });
}
