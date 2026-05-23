# Runtime Flow

## 1. 平台消息进入

平台 adapter 接收 Telegram、QQ、WeCom、Weixin OC、WebUI/Admin 等入口请求，把不同平台的 payload 转成统一内部消息。

```text
platform payload
-> adapter normalize
-> InternalMessage
-> Queue
```

入口 Worker 不直接跑完整 agent。它只做校验、标准化、入队和快速返回。

## 2. Queue 触发 agent

Queue consumer 根据 `agent_id`、`conversation_id` 或 `platform_thread_id` 找到对应 Durable Object。

```text
Queue event
-> resolve agent instance
-> forward to Durable Object
-> append event log
```

Durable Object 保证同一个 agent 的关键状态更新串行化。

## 3. Agent 状态机执行

每次运行被拆成多个 step：

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

每个 step 都要写入持久状态。函数超时、网络错误或平台中断后，可以从最后一个已确认 step 恢复。

## 4. 工具执行

模型不能直接执行动作。模型只能提出工具调用请求。

```text
model output
-> ToolCallRequest
-> Permission Engine
-> Tool Executor
-> Audit Log
-> ToolResult
```

所有带副作用的工具必须支持幂等键：

```text
run_id + step_id + tool_name + operation_hash
```

## 当前运行流程

当前实现的入口已经覆盖外部 webhook、Gateway DO、WebUI/Admin；所有入口都会进入同一条 agent 执行链路：

```text
platform message
-> Worker route or Platform Gateway DO
-> Queue
-> Durable Object
-> persist message
-> create run
-> messaging.send_message
-> complete run
```
