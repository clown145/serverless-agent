# 运行流程

## 概览

所有平台入口都会被标准化为 `InternalMessage`，再通过 Queue 投递到 Agent Durable Object。Worker 不直接运行完整 agent loop。

## 入口标准化

```text
platform payload
-> adapter verify/decrypt
-> adapter normalize
-> InternalMessage
-> Queue
```

adapter 负责平台协议差异，例如签名校验、XML/JSON 解密、消息 ID、conversation ID、附件引用和出站能力映射。

## Queue 投递

Queue consumer 根据 agent 维度解析 Durable Object。

```text
Queue event
-> resolve agent instance
-> forward to Durable Object
-> append mailbox event
```

Queue 负责入口缓冲和失败重试。单个 agent 的顺序由 Durable Object mailbox 保证。

## Agent Durable Object

Durable Object 负责：

- 接收 queue event；
- 将事件写入 mailbox；
- 用 drain loop 串行处理同一 agent 的事件；
- 管理 alarm 和 heartbeat；
- 在失败后恢复未完成事件。

长期运行历史不留在 DO storage；runs、messages、tool calls 和 audit logs 写入 D1。

## Agent 状态机

典型 run 会经过：

```text
received
-> context_loaded
-> model_called
-> tool_requested
-> permission_checked
-> tool_executed
-> result_recorded
-> model_called_again
-> completed | waiting | failed
```

每个关键 step 都应写入持久状态。函数超时、网络错误或平台中断后，可以从最后一个已确认 step 检查和恢复。

## 工具执行

模型不能直接执行动作，只能提出工具调用请求。

```text
model output
-> ToolCallRequest
-> schema validation
-> Permission Engine
-> Tool Executor
-> Audit Log
-> ToolResult
```

所有带副作用的工具必须支持幂等键：

```text
run_id + step_id + tool_name + operation_hash
```

## 当前实现流程

当前外部 webhook、Gateway DO、WebUI/Admin 都进入同一条 agent 执行链路：

```text
platform message
-> Worker route or Platform Gateway DO
-> Queue
-> Durable Object
-> persist message
-> create run
-> agent runtime
-> tools or runtime-managed reply
-> complete run
```

## 相关文档

- [PLATFORM_INTEGRATIONS.md](PLATFORM_INTEGRATIONS.md)
- [FAILURE_AND_CONCURRENCY.md](FAILURE_AND_CONCURRENCY.md)
- [../SCHEDULER_RUNTIME.md](../SCHEDULER_RUNTIME.md)
