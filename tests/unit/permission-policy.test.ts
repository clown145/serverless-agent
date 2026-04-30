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
  it("allows non-dangerous tools by default", async () => {
    const tool: ToolDefinition = {
      name: "vfs.read_file",
      description: "read",
      inputSchema: { type: "object", properties: {} },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "none",
      timeoutMs: 1000
    };

    await expect(evaluateToolPermission(tool, baseContext)).resolves.toMatchObject({
      allowed: true
    });
  });

  it("requires confirmation for dangerous tools", async () => {
    const tool: ToolDefinition = {
      name: "workspace.replace_file",
      description: "dangerous",
      inputSchema: { type: "object", properties: {} },
      permission: { level: 1, scopes: ["workspace:read"] },
      sideEffect: "dangerous",
      timeoutMs: 1000
    };

    await expect(evaluateToolPermission(tool, baseContext)).resolves.toMatchObject({
      allowed: false,
      needsConfirmation: true
    });
  });
});
