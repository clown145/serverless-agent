import { describe, expect, it } from "vitest";
import {
  buildWeixinOcFileItem,
  buildWeixinOcImageItem
} from "../../../src/adapters/weixin-oc/media";

const uploaded = {
  filekey: "file-key",
  downloadEncryptedQueryParam: "download-param",
  aesKeyHex: "00112233445566778899aabbccddeeff",
  aesKeyTransportBase64: "MDAxMTIyMzM0NDU1NjY3Nzg4OTlhYWJiY2NkZGVlZmY=",
  plainSize: 12,
  ciphertextSize: 16
};

describe("Weixin OC media", () => {
  it("builds outbound image items from uploaded CDN media", () => {
    expect(buildWeixinOcImageItem(uploaded)).toEqual({
      type: 2,
      image_item: {
        media: {
          encrypt_query_param: "download-param",
          aes_key: "MDAxMTIyMzM0NDU1NjY3Nzg4OTlhYWJiY2NkZGVlZmY=",
          encrypt_type: 1
        },
        aeskey: "00112233445566778899aabbccddeeff",
        mid_size: 16
      }
    });
  });

  it("builds outbound file items from uploaded CDN media", () => {
    expect(
      buildWeixinOcFileItem({
        uploaded,
        fileName: "report.pdf"
      })
    ).toEqual({
      type: 4,
      file_item: {
        media: {
          encrypt_query_param: "download-param",
          aes_key: "MDAxMTIyMzM0NDU1NjY3Nzg4OTlhYWJiY2NkZGVlZmY=",
          encrypt_type: 1
        },
        file_name: "report.pdf",
        len: "12"
      }
    });
  });
});
