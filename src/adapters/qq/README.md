# QQ Adapter

负责 QQ 平台消息、事件、心跳和出站消息的适配。

QQ 接入方式可能是 webhook/callback，也可能是 gateway/WebSocket。这里不直接处理 agent 逻辑，只把平台事件转成内部事件。

后续文件建议：

```text
normalize.ts
verify.ts
outbound.ts
heartbeat.ts
types.ts
```
