export type TelegramParseMode = "none" | "HTML" | "MarkdownV2";

export const DEFAULT_TELEGRAM_PARSE_MODE: TelegramParseMode = "HTML";

export function normalizeTelegramParseMode(value: unknown): TelegramParseMode {
  return value === "none" || value === "HTML" || value === "MarkdownV2"
    ? value
    : DEFAULT_TELEGRAM_PARSE_MODE;
}

export function telegramParseModePayload(
  parseMode: TelegramParseMode
): "HTML" | "MarkdownV2" | undefined {
  return parseMode === "none" ? undefined : parseMode;
}

export function stripTelegramMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/?(b|strong|i|em|u|s|strike|del|code|pre|blockquote|tg-spoiler)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
