import { listCommands } from "../../commands/registry";

export type TelegramBotCommand = {
  command: string;
  description: string;
};

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  help: "Show available commands",
  start: "Show help and start the bot",
  new: "Open a new conversation",
  sessions: "List conversations",
  switch: "Switch conversation",
  model: "Show or set the model",
  context: "Show or update context settings",
  compact: "Compact conversation context",
  task: "Create a delayed or recurring task",
  sid: "Show session and permission IDs"
};

const MENU_COMMANDS = [
  "help",
  "start",
  "new",
  "sessions",
  "switch",
  "model",
  "context",
  "compact",
  "task",
  "sid"
];

export function createTelegramBotCommands(): TelegramBotCommand[] {
  const supported = new Set<string>();

  for (const command of listCommands("telegram")) {
    supported.add(command.name);
    for (const alias of command.aliases ?? []) {
      supported.add(alias);
    }
  }

  return MENU_COMMANDS.filter((name) => supported.has(name)).map((name) => ({
    command: name,
    description: COMMAND_DESCRIPTIONS[name] ?? `Run /${name}`
  }));
}
