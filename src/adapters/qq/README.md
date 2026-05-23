# QQ Adapter

负责 QQ 平台消息、事件和出站消息的适配。

当前实现面向 QQ 官方机器人，核心代码在 `official/`：

- `connectionMode=gateway`: 使用 `QQOfficialGatewayDurableObject` 维护 QQ Gateway WebSocket、心跳和 resume。
- `connectionMode=webhook`: 使用 `/webhooks/qq-official/:webhookSecret` 接收 QQ 官方 webhook。出站走 direct sender，不维护 Gateway WebSocket。

这里不直接处理 agent 逻辑，只把平台事件转成内部事件，并把平台出站能力封装为统一 outbound adapter。
