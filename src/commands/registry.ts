import type { Platform } from "../shared/types/internal-message";
import { contextCommand } from "./system/context-command";
import { helpCommand } from "./system/help-command";
import { modelCommand } from "./system/model-command";
import { newConversationCommand } from "./system/new-conversation-command";
import { sidCommand } from "./system/sid-command";
import { skillAutoEditsCommand } from "./system/skill-auto-edits-command";
import { taskCommand } from "./system/task-command";
import { switchConversationCommand } from "./system/switch-conversation-command";
import type { CommandDefinition } from "./types";

const COMMANDS: CommandDefinition[] = [
  helpCommand,
  newConversationCommand,
  switchConversationCommand,
  contextCommand,
  modelCommand,
  sidCommand,
  skillAutoEditsCommand,
  taskCommand
];

export function listCommands(platform: Platform): CommandDefinition[] {
  return COMMANDS.filter((command) => commandSupportsPlatform(command, platform));
}

export function findCommand(
  name: string,
  platform: Platform
): CommandDefinition | undefined {
  return listCommands(platform).find((command) =>
    command.name === name || command.aliases?.includes(name)
  );
}

function commandSupportsPlatform(command: CommandDefinition, platform: Platform): boolean {
  return !command.platforms || command.platforms.includes(platform);
}
