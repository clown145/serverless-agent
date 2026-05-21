import { describe, expect, it } from "vitest";
import { extractEncryptValue, parseSimpleXml } from "../../../src/adapters/wecom/xml";

describe("WeCom XML helpers", () => {
  it("parses CDATA and plain XML values", () => {
    expect(
      parseSimpleXml(
        "<xml><ToUserName><![CDATA[ww123]]></ToUserName><AgentID>1000001</AgentID></xml>"
      )
    ).toEqual({
      ToUserName: "ww123",
      AgentID: "1000001"
    });
  });

  it("extracts Encrypt from callback body", () => {
    expect(extractEncryptValue("<xml><Encrypt><![CDATA[abc]]></Encrypt></xml>")).toBe("abc");
  });
});
