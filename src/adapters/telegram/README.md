# Telegram Adapter

负责 Telegram webhook payload 的校验、标准化、Bot API 调用和出站消息。

支持能力：

- `/webhooks/telegram` 入站消息。
- `callback_query`，用于 inline button 和 pending action 确认/拒绝。
- 文本、文件、图片、按钮和 typing 出站。
- Markdown/HTML parse mode，发送失败时回退纯文本。

配置来源按优先级：

1. WebUI `Platforms` 页面保存的加密 Telegram integration。
2. Worker secrets: `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_WEBHOOK_SECRET`。

文件结构：

```text
api.ts
callbacks/
commands.ts
config.ts
credential.ts
formatting.ts
normalize.ts
outbound.ts
types.ts
```
