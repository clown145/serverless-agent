import { z } from "zod";
import { jsonResponse, errorResponse } from "../../shared/http";
import type { Env } from "../../shared/types/env";
import {
  createSchedule,
  listSchedules
} from "../../storage/repositories/schedules-repository";
import { requireAdmin } from "../admin-auth";
import { stringifySchedulePayload } from "../../scheduler/schedule-payload";
import { resolveDueAt } from "../../scheduler/schedule-time";

const createScheduleSchema = z
  .object({
    agentId: z.string().min(1).optional(),
    text: z.string().min(1),
    conversationId: z.string().min(1).optional(),
    dueAt: z.string().datetime().optional(),
    delaySeconds: z.number().int().min(0).optional(),
    intervalSeconds: z.number().int().min(1).optional()
  })
  .refine((value) => value.dueAt || value.delaySeconds !== undefined, {
    message: "Either dueAt or delaySeconds is required"
  });

export async function handleAdminSchedules(
  request: Request,
  env: Env
): Promise<Response> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  if (request.method === "GET") {
    return handleListSchedules(request, env);
  }

  if (request.method === "POST") {
    return handleCreateSchedule(request, env);
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed");
}

async function handleListSchedules(
  request: Request,
  env: Env
): Promise<Response> {
  const agentId = new URL(request.url).searchParams.get("agentId") ?? undefined;
  const schedules = await listSchedules(env.AGENT_DB, agentId);
  return jsonResponse({ ok: true, schedules });
}

async function handleCreateSchedule(
  request: Request,
  env: Env
): Promise<Response> {
  const parsed = createScheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse(400, "invalid_payload", parsed.error.message);
  }

  const dueAt = resolveDueAt(new Date(), {
    dueAt: parsed.data.dueAt,
    delaySeconds: parsed.data.delaySeconds
  });
  const schedule = await createSchedule(env.AGENT_DB, {
    agentId: parsed.data.agentId ?? env.DEFAULT_AGENT_ID ?? "default",
    dueAt,
    intervalSeconds: parsed.data.intervalSeconds,
    payloadJson: stringifySchedulePayload({
      text: parsed.data.text,
      conversationId: parsed.data.conversationId
    })
  });

  return jsonResponse({ ok: true, schedule }, { status: 201 });
}
