import { describe, expect, it } from "vitest";
import { resolveDefaultPolicy } from "../../src/permissions/default-policy";
import type { ToolExecutionContext } from "../../src/tools/types";

const base = {
  env: {} as ToolExecutionContext["env"],
  agentId: "agent",
  actorId: "user",
  runId: "run",
  stepId: "step",
  input: {}
};

describe("default policy", () => {
  it("gives scheduler level 3", () => {
    expect(resolveDefaultPolicy({ ...base, actorId: "scheduler" })).toMatchObject({
      maxLevel: 3,
      scopes: expect.arrayContaining(["schedule:read", "schedule:write"])
    });
  });

  it("gives owner level 4", () => {
    expect(resolveDefaultPolicy({ ...base, actorRole: "owner" })).toMatchObject({
      maxLevel: 4,
      scopes: expect.arrayContaining(["schedule:read", "schedule:write"])
    });
  });

  it("allows admin-owned final replies to send messages", () => {
    expect(resolveDefaultPolicy({ ...base, actorRole: "admin" })).toMatchObject({
      maxLevel: 4,
      scopes: expect.arrayContaining(["message:send"])
    });
  });
});
