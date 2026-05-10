import type { Platform } from "../../shared/types/internal-message";

export function lineBreak(platform: Platform): string {
  return platform === "telegram" ? "\n" : "\n";
}

export function code(value: string, platform: Platform): string {
  if (platform === "telegram") {
    return `<code>${escapeHtml(value)}</code>`;
  }

  return `\`${value}\``;
}

export function bold(value: string, platform: Platform): string {
  if (platform === "telegram") {
    return `<b>${escapeHtml(value)}</b>`;
  }

  return `**${value}**`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
