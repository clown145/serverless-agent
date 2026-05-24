# QQ Official Adapter

## 概览

QQ Official adapter 不依赖 Python `qq-botpy` SDK。它支持 Gateway mode 和 webhook mode，并把 QQ 事件转换成 `InternalMessage` queue jobs。

## Gateway Mode

流程：

1. 使用 `appId` 和 `secret` 获取 app access token。
2. 调用 QQ `/gateway/bot` 获取 WebSocket 地址。
3. 在 `QQOfficialGatewayDurableObject` 中维持 WebSocket session。
4. 发送 `Identify` 或 `Resume`。
5. 按 `heartbeat_interval` 发送心跳。
6. 将 dispatch event 标准化并入队。
7. 通过 QQ HTTP OpenAPI 发送回复。

当前实现使用命名 Durable Object 打开 shard `0`。如果 QQ 返回多 shard，需要按 shard 拆分 object name。

## Webhook Mode

流程：

1. QQ 调用 Worker webhook route。
2. `op=13` validation request 用 bot secret 生成 Ed25519 signature 响应。
3. `op=0` dispatch event 标准化为 `InternalMessage` queue job。
4. Conversation target 存入 D1，后续回复直接调用 QQ OpenAPI。

Webhook mode 不需要维护 Gateway WebSocket，通常更节省 Durable Object duration。

## 文件职责

| 文件                    | 职责                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `api.ts`                | QQ HTTP OpenAPI client。                                    |
| `gateway-session.ts`    | WebSocket lifecycle、identify/resume、heartbeat。           |
| `gateway-payloads.ts`   | Gateway protocol payload builders。                         |
| `normalize.ts`          | Gateway event 到内部消息的转换。                            |
| `conversation-store.ts` | Gateway replies 使用的 DO-local conversation target cache。 |
| `direct-sender.ts`      | Webhook mode 使用的 direct OpenAPI sender。                 |
| `webhook.ts`            | QQ Official webhook event handling。                        |
| `webhook-validation.ts` | QQ webhook validation signature。                           |
| `outbound.ts`           | Platform outbound adapter。                                 |
| `keepalive.ts`          | scheduled/admin connection management。                     |

## 相关文档

- [../../../../docs/architecture/PLATFORM_INTEGRATIONS.md](../../../../docs/architecture/PLATFORM_INTEGRATIONS.md)
