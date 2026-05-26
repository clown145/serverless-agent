import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PreparedAgentLoopContext } from "../../src/core/agent-loop-context";
import type { ModelResponse } from "../../src/core/model/types";
import type { Env } from "../../src/shared/types/env";
import type { InternalMessage } from "../../src/shared/types/internal-message";
import type { ToolRegistry } from "../../src/tools/registry/tool-registry";
import type { RegisteredTool } from "../../src/tools/types";

const mocks = vi.hoisted(() => ({
  prepareAgentLoopContext: vi.fn(),
  getToolSettings: vi.fn(),
  sendFinalMessage: vi.fn(),
  completeRun: vi.fn(),
  appendRunStep: vi.fn()
}));

vi.mock("../../src/core/agent-loop-context", () => ({
  prepareAgentLoopContext: mocks.prepareAgentLoopContext
}));

vi.mock("../../src/storage/repositories/tool-settings-repository", () => ({
  getToolSettings: mocks.getToolSettings
}));

vi.mock("../../src/core/agent-final-message", () => ({
  sendFinalMessage: mocks.sendFinalMessage
}));

vi.mock("../../src/storage/repositories/runs-repository", () => ({
  completeRun: mocks.completeRun,
  appendRunStep: mocks.appendRunStep
}));

const { executeAgentToolLoop } = await import("../../src/core/agent-tool-loop");

describe("executeAgentToolLoop", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.appendRunStep.mockResolvedValue(undefined);
    mocks.sendFinalMessage.mockResolvedValue(undefined);
    mocks.completeRun.mockResolvedValue(undefined);
    mocks.getToolSettings.mockResolvedValue({
      agentId: "agent-1",
      maxToolCallsPerRun: 1
    });
  });

  it("stops before executing tool calls beyond the configured max", async () => {
    const execute = vi.fn(async () => ({ status: "success" as const, output: { ok: true } }));
    const providerResponses: ModelResponse[] = [
      {
        content: "",
        toolCalls: [
          {
            id: "call_1",
            name: "test.tool",
            arguments: { index: 1 }
          },
          {
            id: "call_2",
            name: "test.tool",
            arguments: { index: 2 }
          }
        ]
      }
    ];
    mocks.prepareAgentLoopContext.mockResolvedValue(createContext(execute, providerResponses));

    await executeAgentToolLoop(createEnv(), "run_1", message());

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      "test.tool",
      expect.objectContaining({
        input: { index: 1 },
        runId: "run_1"
      })
    );
    expect(mocks.sendFinalMessage).toHaveBeenCalledWith(
      expect.anything(),
      "run_1",
      expect.objectContaining({ id: "msg_1" }),
      "Task stopped: maximum tool call count exceeded (1)."
    );
    expect(mocks.completeRun).toHaveBeenCalledWith(expect.anything(), "run_1", "failed");
  });
});

function createContext(
  execute: ToolRegistry["execute"],
  responses: ModelResponse[]
): PreparedAgentLoopContext {
  const tool = registeredTool();
  return {
    registry: {
      execute,
      get: () => tool,
      list: () => [tool]
    },
    provider: {
      name: "mock",
      complete: vi.fn(async () => responses.shift() ?? { content: "Done", toolCalls: [] })
    },
    skillCatalog: [],
    history: [],
    platformFormatInstruction: "",
    registryTools: [tool],
    allowedToolNames: new Set([tool.definition.name]),
    reasoning: {
      effort: "auto",
      stateMode: "auto"
    }
  };
}

function registeredTool(): RegisteredTool {
  return {
    definition: {
      name: "test.tool",
      description: "test",
      inputSchema: { type: "object" },
      permission: {
        level: 0,
        scopes: []
      },
      sideEffect: "none",
      timeoutMs: 1000
    },
    source: {
      type: "builtin",
      id: "test",
      name: "Test"
    },
    execute: async () => ({ status: "success", output: {} })
  };
}

function createEnv(): Env {
  return {
    AGENT_DB: {}
  } as Env;
}

function message(): InternalMessage {
  return {
    id: "msg_1",
    agentId: "agent-1",
    conversationId: "webui:default",
    platform: "webui",
    platformMessageId: "platform_msg_1",
    kind: "text",
    text: "use tools",
    receivedAt: "2026-05-26T00:00:00.000Z",
    attachments: [],
    sender: {
      platformUserId: "user_1",
      role: "owner"
    }
  };
}
