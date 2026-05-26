import type { ToolSettingsRecord } from "../storage/repositories/tool-settings-types";

export type ToolCallLimitState = {
  maxToolCallsPerRun: number;
  usedToolCalls: number;
};

export function createToolCallLimitState(settings: ToolSettingsRecord): ToolCallLimitState {
  return {
    maxToolCallsPerRun: settings.maxToolCallsPerRun,
    usedToolCalls: 0
  };
}

export function reserveToolCall(state: ToolCallLimitState): boolean {
  if (state.usedToolCalls >= state.maxToolCallsPerRun) {
    return false;
  }

  state.usedToolCalls += 1;
  return true;
}

export function toolCallLimitExceededMessage(state: ToolCallLimitState): string {
  return `Task stopped: maximum tool call count exceeded (${state.maxToolCallsPerRun}).`;
}
