import { describe, expect, it } from "vitest";
import { setSearchProviderSchema } from "../../src/worker/routes/search/search-schemas";
import { mapSearchSettingsRow } from "../../src/storage/repositories/search-types";

describe("search settings schemas", () => {
  it("accepts default result count updates without changing provider", () => {
    expect(setSearchProviderSchema.parse({ defaultMaxResults: 7 })).toEqual({
      defaultMaxResults: 7
    });
  });

  it("requires at least one search setting field", () => {
    expect(() => setSearchProviderSchema.parse({})).toThrow();
  });

  it("defaults old search settings rows to five results", () => {
    expect(
      mapSearchSettingsRow({
        agent_id: "default",
        provider_id: "sprov",
        updated_at: "2026-01-01T00:00:00.000Z"
      })
    ).toMatchObject({
      defaultMaxResults: 5
    });
  });
});
