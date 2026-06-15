import { describe, expect, it } from "vitest";
import { createRunDiagnostics } from "../../src/observability/run-diagnostics";

describe("run diagnostics", () => {
  it("summarizes run timeline, statuses, latency, and errors", () => {
    const diagnostics = createRunDiagnostics({
      run: {
        created_at: "2026-06-15T10:00:00.000Z",
        updated_at: "2026-06-15T10:00:05.000Z"
      },
      steps: [
        {
          id: "step_received",
          kind: "received",
          status: "completed",
          created_at: "2026-06-15T10:00:00.100Z"
        },
        {
          id: "step_model",
          kind: "model_called",
          status: "completed",
          created_at: "2026-06-15T10:00:01.000Z"
        },
        {
          id: "step_failed",
          kind: "failed",
          status: "failed",
          summary: "Run failed",
          created_at: "2026-06-15T10:00:04.000Z"
        }
      ],
      toolCalls: [
        {
          id: "tool_fast",
          tool_name: "time.now",
          status: "success",
          latency_ms: 20,
          created_at: "2026-06-15T10:00:01.500Z",
          completed_at: "2026-06-15T10:00:01.520Z"
        },
        {
          id: "tool_slow",
          tool_name: "http.request",
          status: "permission_denied",
          error_code: "permission_denied",
          latency_ms: 180,
          created_at: "2026-06-15T10:00:02.000Z",
          completed_at: "2026-06-15T10:00:02.180Z"
        }
      ],
      auditLogs: [
        {
          id: "audit_denied",
          status: "permission_denied",
          created_at: "2026-06-15T10:00:02.000Z"
        }
      ]
    });

    expect(diagnostics).toMatchObject({
      durationMs: 5000,
      stepCount: 3,
      modelCallCount: 1,
      toolCallCount: 2,
      auditLogCount: 1,
      failedStepCount: 1,
      failedToolCallCount: 1,
      stepStatusCounts: { completed: 2, failed: 1 },
      toolStatusCounts: { success: 1, permission_denied: 1 },
      auditStatusCounts: { permission_denied: 1 },
      toolLatencyMs: {
        completedCount: 2,
        average: 100,
        max: 180,
        slowestToolName: "http.request",
        slowestToolId: "tool_slow"
      },
      timeline: {
        startedAt: "2026-06-15T10:00:00.000Z",
        completedAt: "2026-06-15T10:00:05.000Z",
        firstEventAt: "2026-06-15T10:00:00.000Z",
        lastEventAt: "2026-06-15T10:00:05.000Z",
        lastStepAt: "2026-06-15T10:00:04.000Z",
        lastToolCompletedAt: "2026-06-15T10:00:02.180Z"
      },
      errorSummary: {
        count: 2,
        category: "run_failed",
        source: "run_step",
        message: "Run failed",
        at: "2026-06-15T10:00:04.000Z"
      }
    });
    expect(diagnostics.lastError).toBe("Run failed");
  });

  it("keeps pending confirmation as an actionable error category", () => {
    const diagnostics = createRunDiagnostics({
      run: {},
      steps: [],
      toolCalls: [
        {
          id: "tool_pending",
          tool_name: "messaging.send",
          status: "needs_confirmation",
          error_code: "needs_confirmation",
          created_at: "2026-06-15T10:00:00.000Z"
        }
      ],
      auditLogs: []
    });

    expect(diagnostics.errorSummary).toMatchObject({
      count: 1,
      category: "needs_confirmation",
      source: "tool_call",
      code: "needs_confirmation"
    });
    expect(diagnostics.lastError).toBe("needs_confirmation");
  });

  it("uses audit summaries as tool error messages while keeping tool names separate", () => {
    const diagnostics = createRunDiagnostics({
      run: {},
      steps: [],
      toolCalls: [
        {
          id: "tool_denied",
          step_id: "step_tool",
          tool_name: "http.request",
          status: "permission_denied",
          error_code: "permission_denied",
          created_at: "2026-06-15T10:00:00.000Z",
          completed_at: "2026-06-15T10:00:00.010Z"
        }
      ],
      auditLogs: [
        {
          id: "audit_denied",
          step_id: "step_tool",
          status: "permission_denied",
          summary: "Missing required scope: http:request",
          created_at: "2026-06-15T10:00:00.010Z"
        }
      ]
    });

    expect(diagnostics.errorSummary).toMatchObject({
      count: 1,
      category: "permission_denied",
      source: "tool_call",
      toolName: "http.request",
      message: "Missing required scope: http:request",
      code: "permission_denied"
    });
    expect(diagnostics.lastError).toBe("Missing required scope: http:request");
  });
});
