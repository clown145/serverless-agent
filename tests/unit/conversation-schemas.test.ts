import { describe, expect, it } from "vitest";
import {
  createConversationSchema,
  updateConversationSchema
} from "../../src/worker/routes/conversations/conversation-schemas";

describe("conversation schemas", () => {
  it("defaults new conversations to WebUI", () => {
    expect(createConversationSchema.parse({ title: "Work" })).toMatchObject({
      platform: "webui",
      title: "Work"
    });
  });

  it("validates context settings", () => {
    expect(
      updateConversationSchema.parse({
        historyLimit: 24,
        summaryEnabled: false,
        modelProviderId: null,
        modelId: null,
        reasoningEffort: "high",
        reasoningStateMode: "on"
      })
    ).toMatchObject({
      historyLimit: 24,
      summaryEnabled: false,
      modelProviderId: null,
      modelId: null,
      reasoningEffort: "high",
      reasoningStateMode: "on"
    });
    expect(() => updateConversationSchema.parse({ historyLimit: 100 })).toThrow();
    expect(() => updateConversationSchema.parse({ reasoningEffort: "max" })).toThrow();
  });
});
