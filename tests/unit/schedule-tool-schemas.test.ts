import { describe, expect, it } from "vitest";
import {
  createScheduleInputSchema,
  listSchedulesInputSchema
} from "../../src/tools/schedule/schema";

describe("schedule tool schemas", () => {
  it("accepts absolute due times with timezone offsets", () => {
    const parsed = createScheduleInputSchema.parse({
      text: "提醒我检查部署",
      dueAt: "2026-05-12T20:00:00+08:00"
    });

    expect(parsed).toMatchObject({
      text: "提醒我检查部署",
      dueAt: "2026-05-12T20:00:00+08:00"
    });
  });

  it("requires a due time or delay", () => {
    expect(() =>
      createScheduleInputSchema.parse({
        text: "missing time"
      })
    ).toThrow();
  });

  it("requires model provider and model id together", () => {
    expect(() =>
      createScheduleInputSchema.parse({
        text: "bad model pair",
        delaySeconds: 60,
        modelProviderId: "mprov_1"
      })
    ).toThrow();
  });

  it("defaults list options", () => {
    expect(listSchedulesInputSchema.parse({})).toEqual({
      limit: 20,
      includeText: true
    });
  });
});
