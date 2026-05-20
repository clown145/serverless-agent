import type { QqOfficialGatewayIntent } from "./types";

export const QQ_OFFICIAL_INTENTS = {
  guilds: 1 << 0,
  guildMembers: 1 << 1,
  guildMessages: 1 << 9,
  guildMessageReactions: 1 << 10,
  directMessage: 1 << 12,
  openForumEvent: 1 << 18,
  audioAction: 1 << 29,
  publicGuildMessages: 1 << 30,
  publicMessages: 1 << 25
} as const;

export type QqOfficialIntentOptions = {
  enableGroupC2c?: boolean;
  enableGuildDirectMessage?: boolean;
  enablePublicGuildMessages?: boolean;
};

export function qqOfficialIntentMask(
  options: QqOfficialIntentOptions = {}
): QqOfficialGatewayIntent {
  let intents = options.enablePublicGuildMessages === false
    ? 0
    : QQ_OFFICIAL_INTENTS.publicGuildMessages;

  if (options.enableGroupC2c ?? true) {
    intents |= QQ_OFFICIAL_INTENTS.publicMessages;
  }

  if (options.enableGuildDirectMessage ?? true) {
    intents |= QQ_OFFICIAL_INTENTS.directMessage;
  }

  return intents;
}
