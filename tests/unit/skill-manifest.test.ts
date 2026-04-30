import { describe, expect, it } from "vitest";
import { skillManifestSchema } from "../../src/skills/skill-manifest-schema";

describe("skill manifest schema", () => {
  it("parses a minimal manifest", () => {
    const manifest = skillManifestSchema.parse({
      id: "demo",
      name: "Demo",
      version: "0.1.0",
      description: "Demo skill",
      permissions: {
        requiredLevel: 1
      }
    });

    expect(manifest.entry).toBe("SKILL.md");
    expect(manifest.tools).toEqual([]);
    expect(manifest.permissions.scopes).toEqual([]);
  });
});
