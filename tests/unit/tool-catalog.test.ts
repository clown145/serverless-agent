import { describe, expect, it } from "vitest";
import { createBuiltinTools } from "../../src/tools/builtin/create-builtin-tools";
import { createToolCatalog } from "../../src/tools/catalog/tool-catalog";

describe("tool catalog", () => {
  it("exports registered tools with source metadata", () => {
    const catalog = createToolCatalog(createBuiltinTools());
    const readFile = catalog.find((tool) => tool.name === "vfs.read_file");

    expect(readFile).toMatchObject({
      name: "vfs.read_file",
      source: {
        type: "builtin",
        id: "builtin"
      },
      sideEffect: "none"
    });
    expect(readFile?.inputSchema).toMatchObject({ type: "object" });
    expect(catalog.map((tool) => tool.name)).toContain("vfs.command");
    expect(catalog.map((tool) => tool.name)).toContain("vfs.search");
    expect(catalog.map((tool) => tool.name)).toContain("http.request");
    expect(catalog.map((tool) => tool.name)).toContain("web.fetch_page");
    expect(catalog.map((tool) => tool.name)).toContain("schedule.create");
    expect(catalog.map((tool) => tool.name)).toContain("schedule.list");
    expect(catalog.map((tool) => tool.name)).toContain("messaging.send_file");
    expect(catalog.map((tool) => tool.name)).toContain("messaging.send_image");
    expect(catalog.map((tool) => tool.name)).toContain("messaging.send_buttons");
    expect(catalog.map((tool) => tool.name)).toContain("telegram.send_file");
    expect(catalog.map((tool) => tool.name)).toContain("telegram.send_image");
    expect(catalog.map((tool) => tool.name)).toContain("weixin_oc.send_file");
    expect(catalog.map((tool) => tool.name)).toContain("weixin_oc.send_image");
    expect(catalog.find((tool) => tool.name === "weixin_oc.send_image")?.platforms).toEqual([
      "weixin_oc"
    ]);
    expect(
      catalog.find((tool) => tool.name === "weixin_oc.send_image")?.behavior
    ).toMatchObject({
      preventsFinalResponse: true
    });
  });
});
