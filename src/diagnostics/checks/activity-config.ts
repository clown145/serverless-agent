import type { Env } from "../../shared/types/env";
import { diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

type LatestRunRow = {
  status: string;
  updated_at: string;
};

type LatestToolCallRow = {
  status: string;
  tool_name: string;
  completed_at?: string | null;
};

export async function checkActivityConfig(env: Env): Promise<DiagnosticCheck[]> {
  const [runsResult, latestToolCall] = await Promise.all([
    env.AGENT_DB.prepare("SELECT status, updated_at FROM runs ORDER BY created_at DESC LIMIT 20")
      .all<LatestRunRow>(),
    env.AGENT_DB.prepare(
      "SELECT status, tool_name, completed_at FROM tool_calls ORDER BY created_at DESC LIMIT 1"
    ).first<LatestToolCallRow>()
  ]);
  const runs = runsResult.results ?? [];
  const latestRun = runs.at(0);

  return [
    latestRunCheck(latestRun),
    recentRunFailuresCheck(runs),
    latestToolCallCheck(latestToolCall)
  ];
}

function latestRunCheck(row?: LatestRunRow | null): DiagnosticCheck {
  return row
    ? diagnosticOk("activity", "latest_run", "Latest run", `${row.status} at ${row.updated_at}`)
    : diagnosticWarn(
        "activity",
        "latest_run",
        "Latest run",
        "No runs recorded yet",
        "Send a WebUI or platform message"
      );
}

function recentRunFailuresCheck(runs: LatestRunRow[]): DiagnosticCheck {
  const failedRuns = runs.filter((run) => run.status === "failed");
  const latestFailure = failedRuns.at(0);

  return latestFailure
    ? diagnosticWarn(
        "activity",
        "recent_run_failures",
        "Recent run failures",
        `${failedRuns.length}/${runs.length} recent run(s) failed; latest at ${latestFailure.updated_at}`,
        "Open Runs or Debug Center for details"
      )
    : diagnosticOk(
        "activity",
        "recent_run_failures",
        "Recent run failures",
        runs.length ? "No failures in recent runs" : "No runs recorded yet"
      );
}

function latestToolCallCheck(row?: LatestToolCallRow | null): DiagnosticCheck {
  return row
    ? diagnosticOk(
        "activity",
        "latest_tool_call",
        "Latest tool call",
        `${row.tool_name}: ${row.status}`
      )
    : diagnosticWarn(
        "activity",
        "latest_tool_call",
        "Latest tool call",
        "No tool calls recorded yet",
        "Ask the agent to use a tool"
      );
}
