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
    expect(catalog.map((tool) => tool.name)).toContain("web.fetch_page");
  });
});
