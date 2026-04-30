export type RunStatus = "queued" | "running" | "completed" | "failed";

export type RunStepKind =
  | "received"
  | "context_loaded"
  | "model_called"
  | "tool_requested"
  | "tool_completed"
  | "completed";

export type RunStepInput = {
  id: string;
  runId: string;
  agentId: string;
  kind: RunStepKind;
  status: RunStatus;
  summary?: string;
};
