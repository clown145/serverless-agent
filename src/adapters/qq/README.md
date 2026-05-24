# QQ Adapter

## 概览

QQ adapter 负责 QQ 平台消息、事件和出站消息适配。当前实现面向 QQ Official，核心代码在 `official/`。

## 入站模式

- `connectionMode=gateway`：使用 `QQOfficialGatewayDurableObject` 维护 QQ Gateway WebSocket、心跳和 resume。
- `connectionMode=webhook`：使用 `/webhooks/qq-official/:webhookSecret` 接收 QQ Official webhook，出站走 direct sender。

## 边界

这里不处理 agent 逻辑，只把平台事件转成内部事件，并把 QQ 出站能力封装为统一 outbound adapter。

## 相关文档

- [official/README.md](official/README.md)
- [../../../docs/architecture/PLATFORM_INTEGRATIONS.md](../../../docs/architecture/PLATFORM_INTEGRATIONS.md)
