# Telegram Adapter

## 概览

Telegram adapter 负责 Telegram webhook payload 校验、标准化、Bot API 调用和出站消息。

## 支持能力

- `/webhooks/telegram` 入站消息。
- `callback_query`，用于 inline button 和 pending action 确认/拒绝。
- 文本、文件、图片、按钮和 typing 出站。
- Markdown/HTML parse mode，发送失败时回退纯文本。

## Bot Command 菜单

`commands.ts` 会生成传给 Telegram `setMyCommands` 的菜单。Telegram Bot API 要求
command 只能包含 `a-z`、`0-9` 和 `_`，长度为 1-32 个字符，因此菜单里只发布符合
这个限制的命令。

带连字符的系统命令需要使用合法 alias 暴露到 Telegram 菜单。例如
`/skill-auto-edits` 的菜单命令是 `/skillauto`。运行时 parser 仍支持用户手动发送
canonical 命令名。

## 配置来源

优先级：

1. WebUI `Platforms` 页面保存的加密 Telegram integration。
2. Worker secrets：`TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_WEBHOOK_SECRET`。

## 文件职责

| 文件            | 职责                                          |
| --------------- | --------------------------------------------- |
| `api.ts`        | Bot API client。                              |
| `callbacks/`    | `callback_query` 和 pending action callback。 |
| `commands.ts`   | Telegram command helpers。                    |
| `config.ts`     | 配置解析。                                    |
| `credential.ts` | 加密 credential 读取。                        |
| `formatting.ts` | parse mode 和 fallback formatting。           |
| `normalize.ts`  | Telegram update 到 `InternalMessage` 的转换。 |
| `outbound.ts`   | Platform outbound adapter。                   |

## 相关文档

- [../../../docs/architecture/PLATFORM_INTEGRATIONS.md](../../../docs/architecture/PLATFORM_INTEGRATIONS.md)
