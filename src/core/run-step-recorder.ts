import { createId } from "../shared/ids";
import type { Env } from "../shared/types/env";
import type { SelectedSkill } from "../skills/skill-selector";
import { appendRunStep } from "../storage/repositories/runs-repository";

export async function recordContextStep(
  env: Env,
  runId: string,
  agentId: string,
  selectedSkill?: SelectedSkill
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId,
    kind: "context_loaded",
    status: "completed",
    summary: selectedSkill ? `skill:${selectedSkill.skill.id}` : "no active skill"
  });
}

export async function recordModelStep(
  env: Env,
  runId: string,
  agentId: string,
  providerName: string,
  toolCallCount: number
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId,
    kind: "model_called",
    status: "completed",
    summary: `${providerName} returned ${toolCallCount} tool call(s)`
  });
}

export async function recordToolRequestedStep(
  env: Env,
  input: {
    stepId: string;
    runId: string;
    agentId: string;
    toolName: string;
  }
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: input.stepId,
    runId: input.runId,
    agentId: input.agentId,
    kind: "tool_requested",
    status: "completed",
    summary: input.toolName
  });
}

export async function recordToolCompletedStep(
  env: Env,
  input: {
    runId: string;
    agentId: string;
    toolName: string;
    status: "completed" | "failed";
    summaryStatus: string;
  }
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId: input.runId,
    agentId: input.agentId,
    kind: "tool_completed",
    status: input.status,
    summary: `${input.toolName}: ${input.summaryStatus}`
  });
}

export async function recordRunCompletedStep(
  env: Env,
  runId: string,
  agentId: string
): Promise<void> {
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId,
    kind: "completed",
    status: "completed",
    summary: "Run completed"
  });
}
