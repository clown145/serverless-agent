import { describe, expect, it } from "vitest";
import {
  diagnosticError,
  diagnosticOk,
  diagnosticWarn
} from "../../src/diagnostics/check-result";
import { summarizeDiagnostics } from "../../src/diagnostics/types";

describe("diagnostics", () => {
  it("summarizes check status counts", () => {
    const checks = [
      diagnosticOk("runtime", "d1", "D1", "ok"),
      diagnosticWarn("search", "search", "Search", "missing"),
      diagnosticError("model", "model", "Model", "missing")
    ];

    expect(summarizeDiagnostics(checks)).toEqual({
      ok: 1,
      warn: 1,
      error: 1,
      total: 3
    });
  });
});
