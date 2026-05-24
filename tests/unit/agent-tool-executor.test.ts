import { describe, expect, it, vi } from "vitest";
import { executeAgentToolCall } from "../../src/core/agent-tool-executor";
import type { Env } from "../../src/shared/types/env";
import type { InternalMessage } from "../../src/shared/types/internal-message";
import type { SelectedSkill } from "../../src/skills/skill-selector";
import type { ToolRegistry } from "../../src/tools/registry/tool-registry";

describe("agent tool executor", () => {
  it("blocks active skills from reading VFS paths outside the skill directory", async () => {
    const execute = vi.fn();
    const execution = await executeAgentToolCall(createEnv(), {
      registry: {
        execute,
        get: () => undefined,
        list: () => []
      } satisfies ToolRegistry,
      runId: "run_1",
      message: createMessage(),
      toolCall: {
        id: "call_1",
        name: "vfs.read_file",
        arguments: { path: "/workspace/private.md" }
      },
      allowedToolNames: new Set(["vfs.read_file"]),
      selectedSkill
    });

    expect(execution.result).toMatchObject({
      status: "permission_denied",
      error: {
        code: "skill_vfs_path_not_allowed"
      }
    });
    expect(execute).not.toHaveBeenCalled();
  });
});

const selectedSkill: SelectedSkill = {
  userText: "Read the skill reference",
  skill: {
    id: "reader",
    instructions: "Read files only.",
    metadata: {
      id: "reader",
      name: "Reader",
      version: "0.1.0",
      description: "Read-only skill"
    }
  }
};

function createEnv(): Env {
  return {
    AGENT_DB: createRunStepDb()
  } as unknown as Env;
}

function createRunStepDb(): D1Database {
  return {
    prepare() {
      const statement = {
        bind() {
          return statement;
        },
        async run() {
          return { meta: { changes: 1 } };
        }
      };
      return statement;
    }
  } as unknown as D1Database;
}

function createMessage(): InternalMessage {
  return {
    id: "msg_1",
    agentId: "default",
    conversationId: "webui:default",
    platform: "webui",
    platformMessageId: "platform_msg_1",
    kind: "text",
    text: "/skill reader read /workspace/private.md",
    rawRef: "msg_1",
    receivedAt: "2026-05-24T00:00:00.000Z",
    attachments: [],
    sender: {
      platformUserId: "user_1",
      role: "owner"
    }
  };
}
