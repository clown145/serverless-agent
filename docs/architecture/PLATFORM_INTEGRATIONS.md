# 平台接入

## 概览

平台适配层只负责平台协议和内部协议互转，不做 agent 决策。所有入口最终都会转换成 `InternalMessage`，再进入 Queue 和 Agent Durable Object。

## 统一接入模型

被动 webhook 入口：

```text
Telegram webhook
WeCom webhook
QQ Official webhook
Admin/WebUI message
        |
        v
Worker route
-> verify / decrypt / normalize
-> AGENT_QUEUE
        |
        v
Agent Durable Object
```

主动网关入口：

```text
QQ Official gateway mode
Weixin OC long-poll mode
        |
        v
Platform Gateway Durable Object
-> normalize
-> AGENT_QUEUE
        |
        v
Agent Durable Object
```

Worker 和 Platform Gateway Durable Object 都只做轻量工作：

- 验证平台签名或 webhook secret；
- 解密平台回调；
- 标准化为 `InternalMessage`；
- 保存必要的平台会话索引；
- 快速入队，不执行 LLM 或重型工具。

## 当前适配器

| 平台         | 内部 platform | 入站方式                                                                                                              | 出站能力                                         | 主要状态                                                         |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Telegram     | `telegram`    | `POST /webhooks/telegram`                                                                                             | 文本、文件、图片、按钮、typing                   | WebUI integration 或 Worker secrets                              |
| QQ Official  | `qq`          | `connectionMode=gateway` 使用 DO WebSocket；`connectionMode=webhook` 使用 `POST /webhooks/qq-official/:webhookSecret` | 文本；群聊/C2C 支持文件和图片；频道/私信支持文本 | D1 integration、conversation target，gateway 模式另有 DO session |
| WeCom        | `wecom`       | `GET/POST /webhooks/wecom/:webhookSecret`                                                                             | 文本下行、客服联系入口                           | D1 integration、加密 secret                                      |
| Weixin OC    | `weixin_oc`   | Gateway DO 扫码登录和 HTTP long-poll                                                                                  | 文本、文件、图片、typing                         | 加密 token 在 D1；运行游标和 context token 在 DO storage         |
| WebUI        | `webui`       | `POST /admin/messages`                                                                                                | 写入本地 WebUI conversation history              | D1                                                               |
| Admin script | `admin`       | `POST /admin/messages`                                                                                                | 写入本地 admin conversation history              | D1                                                               |

`webhook` 仍是内部平台枚举的一员，用于通用 webhook 类入口和权限策略兼容。

## Telegram

Telegram 通过 `/webhooks/telegram` 接收 Bot API update。

- 校验 `x-telegram-bot-api-secret-token`。
- 支持普通消息和 `callback_query`。
- 出站使用 Bot API。
- 支持 Markdown/HTML parse mode；发送失败时回退纯文本。
- `sendButtons` 使用 Telegram inline keyboard，pending action 的“确认 / 拒绝”按钮也走这条通路。

配置优先级：

1. WebUI `Platforms` 页面保存的 Telegram integration。
2. Worker secrets: `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_WEBHOOK_SECRET`。

## WeCom

企业微信通过 `/webhooks/wecom/:webhookSecret` 接收回调。

- `GET` 用于企业微信 URL 验证。
- `POST` 解密 XML callback，解析客服消息，再拉取客服消息详情。
- 出站使用企业微信客服 API。
- WebUI 可创建 integration、测试凭据、生成客服联系入口。

## QQ Official

### Webhook Mode

QQ Official webhook 模式通过 `/webhooks/qq-official/:webhookSecret` 接收事件。

- `op=13` 是 webhook 校验事件，运行时用 bot secret 生成 Ed25519 signature 响应。
- `op=0` 是业务事件，标准化为 `InternalMessage` 后入队。
- 出站不经过 Gateway Durable Object，而是使用 QQ OpenAPI direct sender。
- 机器人必须先收到某个群、C2C、频道或私信的入站事件，系统才知道对应 conversation target。

Webhook 模式不需要 Worker 出站固定 IP，因为 QQ 主动把事件推到 Worker。

### Gateway Mode

`connectionMode=gateway` 时，QQ Official 使用 `QQOfficialGatewayDurableObject` 维持 WebSocket Gateway session。

- Gateway DO 按 `agentId + integrationId + appId` 分片。
- 启动后调用 QQ `/gateway/bot` 获取 WebSocket 地址。
- 收到 `Hello` 后按平台下发的 `heartbeat_interval` 发送心跳。
- 新 session 发送 `Identify`，已有 `sessionId` 和 `lastSeq` 时尝试 `Resume`。
- 业务事件会被标准化并入队。

这种模式不需要配置 QQ webhook 回调，但会持续占用 Durable Object duration。免费额度紧张时，优先考虑 webhook mode。

## Weixin OC

`weixin_oc` 使用 `WeixinOcGatewayDurableObject` 管理扫码登录、状态轮询和出站发送。

- `/login/start` 获取二维码并写入 DO storage。
- DO Alarm 轮询二维码状态，确认后保存 token。
- token 加密保存到 D1 credential 表。
- `syncBuf`、`accountId`、`contextTokens` 等运行状态保存在 DO storage。
- 登录后 DO Alarm 周期调用 `getUpdates`，把增量消息标准化后入队。
- 入站图片会尝试下载、解密并写入当前对象存储后端；写入失败不阻断整条消息。

`context_token` 是向某个微信用户回复的必要上下文。用户至少先发来一条消息，系统记录该用户的 `context_token` 后，agent 才能主动回到这个微信会话。

## WebUI 和 Admin

WebUI 和 admin 脚本通过 `/admin/messages` 创建内部消息，不走外部平台 webhook。

- `platform=webui` 是浏览器管理端默认入口。
- `platform=admin` 保留给 curl、脚本和本地调试。
- 出站消息不会调用外部平台 API，而是写入 D1 conversation history。

这两个入口复用同一套 Queue、Agent、Tool、Permission 和 Audit 流程，因此可以单独配置 `platform:webui` 或 `platform:admin` 权限策略。

## 相关文档

- [../ADMIN_WEBUI.md](../ADMIN_WEBUI.md)
- [../PERMISSIONS_RUNTIME.md](../PERMISSIONS_RUNTIME.md)
- [RUNTIME_FLOW.md](RUNTIME_FLOW.md)
