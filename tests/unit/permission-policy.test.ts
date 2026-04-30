import { describe, expect, it } from "vitest";
import { evaluateToolPermission } from "../../src/tools/permissions/policy";
import type { ToolDefinition, ToolExecutionContext } from "../../src/tools/types";

const baseContext = {
  env: {} as ToolExecutionContext["env"],
  agentId: "agent",
  actorId: "user",
  runId: "run",
  stepId: "step",
  input: {}
};

describe("permission policy", () => {
  it("allows non-dangerous tools by default", () => {
    const tool: ToolDefinition = {
      name: "vfs.read_file",
      description: "read",
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 1000
    };

    expect(evaluateToolPermission(tool, baseContext).allowed).toBe(true);
  });

  it("blocks dangerous tools without explicit confirmation", () => {
    const tool: ToolDefinition = {
      name: "permissions.update",
      description: "dangerous",
      permission: { level: 5, scopes: ["permissions:write"] },
      sideEffect: "dangerous",
      timeoutMs: 1000
    };

    expect(evaluateToolPermission(tool, baseContext).allowed).toBe(false);
  });
});
