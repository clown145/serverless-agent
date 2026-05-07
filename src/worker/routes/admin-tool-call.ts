import { createId } from "../../shared/ids";
import { errorResponse, jsonResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import { nowIso } from "../../shared/time";
import {
  appendRunStep,
  completeRun,
  createRun
} from "../../storage/repositories/runs-repository";
import { createRuntimeToolRegistry } from "../../tools/registry/tool-registry";
import { requireAdmin } from "../admin-auth";
import { callToolSchema, zodMessage } from "./tools/tool-call-schemas";

export async function handleAdminToolCall(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  const parsed = callToolSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", zodMessage(parsed.error));
  }

  const registry = await createRuntimeToolRegistry(env);
  if (!registry.list().some((tool) => tool.definition.name === parsed.data.toolName)) {
    return errorResponse(404, "tool_not_found", "Tool not found");
  }

  const agentId = parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default";
  const runId = createId("run");
  const stepId = createId("step");
  const startedAt = nowIso();
  const started = Date.now();

  await createDebugRun(env, {
    runId,
    stepId,
    agentId,
    toolName: parsed.data.toolName,
    conversationId: parsed.data.conversationId ?? "tool-debug"
  });

  const result = await registry.execute(parsed.data.toolName, {
    agentId,
    actorId: parsed.data.actorId ?? "admin-webui",
    actorRole: parsed.data.actorRole ?? "admin",
    platform: parsed.data.platform ?? "webui",
    conversationId: parsed.data.conversationId ?? "tool-debug",
    runId,
    stepId,
    input: parsed.data.input,
    allowDangerous: parsed.data.allowDangerous
  });

  const completedAt = nowIso();
  const runStatus = result.status === "success" ? "completed" : "failed";
  await appendRunStep(env.AGENT_DB, {
    id: createId("step"),
    runId,
    agentId,
    kind: "tool_completed",
    status: runStatus,
    summary: `${parsed.data.toolName}: ${result.status}`
  });
  await completeRun(env.AGENT_DB, runId, runStatus);

  return jsonResponse({
    ok: true,
    call: {
      toolName: parsed.data.toolName,
      runId,
      stepId,
      startedAt,
      completedAt,
      latencyMs: Date.now() - started,
      result
    }
  });
}

async function createDebugRun(
  env: Env,
  input: {
    runId: string;
    stepId: string;
    agentId: string;
    toolName: string;
    conversationId: string;
  }
): Promise<void> {
  const now = nowIso();
  await createRun(env.AGENT_DB, {
    id: input.runId,
    agentId: input.agentId,
    conversationId: input.conversationId,
    triggerMessageId: "manual-tool-call",
    status: "running",
    createdAt: now,
    updatedAt: now
  });
  await appendRunStep(env.AGENT_DB, {
    id: input.stepId,
    runId: input.runId,
    agentId: input.agentId,
    kind: "tool_requested",
    status: "completed",
    summary: input.toolName
  });
}
