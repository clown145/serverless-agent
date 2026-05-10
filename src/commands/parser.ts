import type { ParsedCommand } from "./types";

export function parseCommand(text: string | undefined): ParsedCommand | undefined {
  const trimmed = text?.trim();
  if (!trimmed?.startsWith("/")) {
    return undefined;
  }

  const [rawName = "", ...args] = trimmed.slice(1).split(/\s+/);
  const name = rawName.split("@")[0]?.toLowerCase();
  if (!name) {
    return undefined;
  }

  return {
    raw: trimmed,
    name,
    args,
    rest: trimmed.slice(rawName.length + 1).trim()
  };
}
