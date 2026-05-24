import { listCommands } from "../registry";
import type { CommandDefinition } from "../types";
import { bold, code } from "./format";

export const helpCommand: CommandDefinition = {
  name: "help",
  aliases: ["start"],
  title: "Help",
  description: "Show available commands.",
  async execute({ message }) {
    const commands = listCommands(message.platform);
    const lines = [
      bold("Available Commands", message.platform),
      ...commands.map(
        (command) => `${code(commandUsage(command), message.platform)} - ${command.description}`
      ),
      "",
      "Common: /new opens a conversation, /sessions lists sessions, /switch <session> switches sessions, /model use <model> changes models, /context compact compacts context, /task in 300 <task> creates a future task."
    ];

    return { handled: true, responseText: lines.join("\n") };
  }
};

function commandUsage(command: { name: string; aliases?: string[] }): string {
  const aliases = command.aliases?.length
    ? ` (${command.aliases.map((item) => `/${item}`).join(", ")})`
    : "";
  return `/${command.name}${aliases}`;
}
