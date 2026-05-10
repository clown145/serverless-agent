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
      bold("可用指令", message.platform),
      ...commands.map((command) =>
        `${code(`/${command.name}`, message.platform)} - ${command.description}`
      )
    ];

    return { handled: true, responseText: lines.join("\n") };
  }
};
