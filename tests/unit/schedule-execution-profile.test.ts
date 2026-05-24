import { describe, expect, it } from "vitest";
import {
  createScheduleExecutionProfile,
  parseScheduleExecutionProfile,
  stringifyScheduleExecutionProfile
} from "../../src/scheduler/execution-profile";

describe("schedule execution profile", () => {
  it("records creator, context, model, and permission mode", () => {
    const profile = createScheduleExecutionProfile({
      createdByActorId: "789",
      createdByActorRole: "owner",
      createdFromPlatform: "telegram",
      createdFromConversationId: "telegram:789",
      createdFromRunId: "run_1",
      modelProviderId: "mprov_1",
      modelId: "gemini-2.5-flash"
    });

    expect(profile).toMatchObject({
      runAs: "creator",
      contextMode: "latest_conversation",
      modelMode: "fixed",
      permissionMode: "creator_current",
      createdByActorId: "789",
      createdFromConversationId: "telegram:789"
    });

    expect(parseScheduleExecutionProfile(stringifyScheduleExecutionProfile(profile))).toEqual(
      profile
    );
  });

  it("follows conversation model when no fixed model is provided", () => {
    expect(
      createScheduleExecutionProfile({
        createdByActorId: "admin"
      })
    ).toMatchObject({
      modelMode: "follow_conversation"
    });
  });
});
