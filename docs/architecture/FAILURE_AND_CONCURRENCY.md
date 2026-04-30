# Failure And Concurrency

## 失败恢复

每个 run step 必须满足：

- 可重试。
- 有幂等键。
- 记录输入和输出。
- 错误可分类。
- 超过重试次数后进入 `failed` 或 `waiting_for_user`。

错误分类：

```text
transient: 网络、限流、临时服务失败
permission_denied: 权限不足
validation_error: 参数错误
external_error: 第三方 API 返回失败
internal_error: 程序错误
```

## 并发模型

- 同一个 agent 的关键状态由 Durable Object 串行处理。
- 不同 agent 可以并行。
- 同一个 run 内的危险工具不并行执行。
- 只读搜索类工具可以并发，但必须受限流控制。

## 可观测性

每次运行都记录：

- inbound event。
- normalized message。
- selected skills。
- model request metadata。
- tool calls。
- permission decisions。
- storage writes。
- outbound messages。
- errors。
- cost/usage。

日志分两类：

- audit log：长期保存，可追责。
- debug log：短期保存，用于开发调试。
