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
        `${code(commandUsage(command), message.platform)} - ${command.description}`
      ),
      "",
      "常用：/new 开新会话，/sessions 看会话，/switch <会话> 切换，/model use <模型> 切模型，/context compact 压缩上下文。"
    ];

    return { handled: true, responseText: lines.join("\n") };
  }
};

function commandUsage(command: { name: string; aliases?: string[] }): string {
  const aliases = command.aliases?.length ? ` (${command.aliases.map((item) => `/${item}`).join(", ")})` : "";
  return `/${command.name}${aliases}`;
}
