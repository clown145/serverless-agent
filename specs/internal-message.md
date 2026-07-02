# Internal Message Spec

## 概览

`InternalMessage` 用于消除 Telegram、QQ、WeCom、Weixin OC、Email、Webhook、WebUI/Admin 等平台差异。adapter 入站的目标是产出这个结构。

## InternalMessage

```ts
type InternalMessage = {
  id: string;
  platform: "telegram" | "qq" | "wecom" | "weixin_oc" | "webhook" | "admin" | "webui" | "email";
  platformMessageId: string;
  agentId: string;
  conversationId: string;
  sender: MessageSender;
  kind: "text" | "command" | "attachment" | "event";
  text?: string;
  attachments: MessageAttachment[];
  rawRef?: string;
  scheduleId?: string;
  modelProviderId?: string;
  modelId?: string;
  receivedAt: string;
};
```

## MessageSender

```ts
type MessageSender = {
  platformUserId: string;
  displayName?: string;
  role: "owner" | "admin" | "member" | "unknown";
};
```

## MessageAttachment

```ts
type MessageAttachment = {
  id: string;
  type: "image" | "file" | "audio" | "video" | "unknown";
  name?: string;
  mimeType?: string;
  size?: number;
  // Historical name. The value is an object-storage key, not necessarily R2.
  r2Key?: string;
  sourceUrl?: string;
  captionText?: string;
  captionModelProviderId?: string;
  captionModelId?: string;
  captionUpdatedAt?: string;
  dataBase64?: string;
};
```

## 规则

- `rawRef` 指向原始 payload 的存储位置，不直接塞大对象。
- adapter 必须保证 `conversationId` 稳定。
- 入队消息必须有 `agentId`。
- 附件大内容放对象存储。
- `r2Key` 是历史字段名，实际后端可能是 R2、S3-compatible 或 D1 lite。
- `dataBase64` 只用于小型内联内容或平台发送所需的临时载荷，不作为大附件长期存储。

## 相关文档

- [../src/adapters/README.md](../src/adapters/README.md)
- [../docs/architecture/PLATFORM_INTEGRATIONS.md](../docs/architecture/PLATFORM_INTEGRATIONS.md)
