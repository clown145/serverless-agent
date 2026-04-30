# Internal Message Spec

内部消息用于消除 Telegram、QQ、Webhook 等平台差异。

## InternalMessage

```ts
type InternalMessage = {
  id: string
  platform: "telegram" | "qq" | "webhook" | "admin"
  platformMessageId: string
  agentId: string
  conversationId: string
  sender: MessageSender
  kind: "text" | "command" | "attachment" | "event"
  text?: string
  attachments: MessageAttachment[]
  rawRef?: string
  receivedAt: string
}
```

## MessageSender

```ts
type MessageSender = {
  platformUserId: string
  displayName?: string
  role: "owner" | "admin" | "member" | "unknown"
}
```

## MessageAttachment

```ts
type MessageAttachment = {
  id: string
  type: "image" | "file" | "audio" | "video" | "unknown"
  name?: string
  mimeType?: string
  size?: number
  r2Key?: string
  sourceUrl?: string
}
```

## 规则

- `rawRef` 指向原始 payload 的存储位置，不直接塞大对象。
- adapter 必须保证 `conversationId` 稳定。
- 入队消息必须有 `agentId`。
- 附件大内容放 R2。
