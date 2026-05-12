import { createSchedule } from "../../storage/repositories/schedules-repository";
import { stringifySchedulePayload } from "../../scheduler/schedule-payload";
import { computeNextDueAt } from "../../scheduler/schedule-time";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const taskCommand: CommandDefinition = {
  name: "task",
  aliases: ["todo"],
  title: "Task",
  description: "Create a delayed or recurring task.",
  async execute({ env, message, command }) {
    const parsed = parseTaskArgs(command.args);
    if (!parsed) {
      return {
        handled: true,
        responseText: usage(message.platform)
      };
    }

    const dueAt = computeNextDueAt(new Date(), parsed.delaySeconds);
    const schedule = await createSchedule(env.AGENT_DB, {
      agentId: message.agentId,
      title: parsed.text.slice(0, 80),
      dueAt,
      intervalSeconds: parsed.intervalSeconds,
      platform: message.platform,
      conversationId: message.conversationId,
      actorId: message.sender.platformUserId,
      actorRole: message.sender.role,
      maxAttempts: 2,
      retryDelaySeconds: 300,
      payloadJson: stringifySchedulePayload({
        title: parsed.text.slice(0, 80),
        text: parsed.text,
        platform: message.platform,
        conversationId: message.conversationId,
        actorId: message.sender.platformUserId,
        actorRole: message.sender.role
      })
    });

    return {
      handled: true,
      responseText: [
        bold("任务已创建", message.platform),
        `ID：${code(schedule.id, message.platform)}`,
        `下次执行：${schedule.dueAt}`,
        parsed.intervalSeconds ? `周期：${parsed.intervalSeconds} 秒` : "类型：一次性"
      ].join("\n")
    };
  }
};

function parseTaskArgs(args: string[]): {
  delaySeconds: number;
  intervalSeconds?: number;
  text: string;
} | undefined {
  const mode = args[0]?.toLowerCase();
  if (mode === "in") {
    const delaySeconds = Number(args[1]);
    const text = args.slice(2).join(" ").trim();
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0 || !text) {
      return undefined;
    }

    return { delaySeconds, text };
  }

  if (mode === "every") {
    const intervalSeconds = Number(args[1]);
    const text = args.slice(2).join(" ").trim();
    if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1 || !text) {
      return undefined;
    }

    return { delaySeconds: intervalSeconds, intervalSeconds, text };
  }

  return undefined;
}

function usage(platform: Parameters<typeof code>[1]): string {
  return [
    "用法：",
    code("/task in 300 搜索最新公告并总结", platform),
    code("/task every 3600 检查一次项目状态", platform)
  ].join("\n");
}
