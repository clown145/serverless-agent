# Telegram Adapter

负责 Telegram webhook payload 的校验、标准化、Bot API 调用和出站消息。

配置来源按优先级：

1. WebUI `Platforms` 页面保存的加密 Telegram integration。
2. Worker secrets: `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_WEBHOOK_SECRET`。

文件结构：

```text
api.ts
config.ts
credential.ts
normalize.ts
outbound.ts
types.ts
```
