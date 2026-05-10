import type { RunStatus } from "../core/run-state";
import type { Env } from "../shared/types/env";
import type { InternalMessage, Platform } from "../shared/types/internal-message";

export type ParsedCommand = {
  raw: string;
  name: string;
  args: string[];
  rest: string;
};

export type CommandContext = {
  env: Env;
  runId: string;
  message: InternalMessage;
  rootConversationId: string;
  command: ParsedCommand;
};

export type CommandResult = {
  handled: true;
  responseText?: string;
  status?: RunStatus;
};

export type CommandDefinition = {
  name: string;
  aliases?: string[];
  title: string;
  description: string;
  platforms?: Platform[];
  execute(context: CommandContext): Promise<CommandResult>;
};

export type CommandHandlingResult =
  | CommandResult
  | {
      handled: false;
    };
