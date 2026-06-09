import { describe, expect, it } from "vitest";
import { formatToolResultForModel } from "../../src/core/model/tool-result-formatter";

describe("formatToolResultForModel", () => {
  it("formats permission_denied with clear guidance for the model", () => {
    const result = {
      status: "permission_denied" as const,
      error: {
        code: "permission_denied",
        message: "Missing required scope: http:request",
        retryable: false
      }
    };

    const output = formatToolResultForModel(result);

    expect(output).toContain("Permission denied (code: permission_denied)");
    expect(output).toContain("Missing required scope: http:request");
    expect(output).toContain("If this tool or permission is necessary");
    expect(output).toContain("ask them to grant the required permission");
  });

  it("keeps normal tool results as JSON", () => {
    const result = { status: "success", output: { ok: true } };
    const output = formatToolResultForModel(result);
    expect(output).toBe(JSON.stringify(result));
  });

  it("handles permission_denied without an error object gracefully", () => {
    const result = {
      status: "permission_denied" as const
    };

    const output = formatToolResultForModel(result);

    expect(output).toContain("Permission denied");
    expect(output).toContain("Reason: Permission denied");
    expect(output).toContain("If this tool or permission is necessary");
  });

  it("handles skill-based permission_denied the same way", () => {
    const result = {
      status: "permission_denied" as const,
      error: {
        code: "skill_tool_not_allowed",
        message: "Skill foo does not allow tool http.request",
        retryable: false
      }
    };

    const output = formatToolResultForModel(result);
    expect(output).toContain("Permission denied (code: skill_tool_not_allowed)");
    expect(output).toContain("Skill foo does not allow tool http.request");
  });
});
