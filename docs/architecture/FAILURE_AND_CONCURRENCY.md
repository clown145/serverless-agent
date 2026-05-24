# 失败与并发

## 概览

运行时假设平台请求、Queue 投递、模型调用、工具调用和存储写入都可能失败。设计目标不是避免所有失败，而是让失败可重试、可追踪，并且不会破坏同一 agent 的状态顺序。

## 失败恢复

每个 run step 应满足：

- 可重试；
- 有幂等键；
- 记录输入摘要和输出摘要；
- 错误可分类；
- 超过重试次数后进入 `failed` 或 `waiting_for_user`。

错误分类：

```text
transient: 网络、限流、临时服务失败
permission_denied: 权限不足
validation_error: 参数错误
external_error: 第三方 API 返回失败
internal_error: 程序错误或不变量被破坏
```

## 并发模型

- 同一个 agent 的入站事件先写入 Durable Object mailbox，再由单个 drain loop 串行处理。
- 不同 agent 可以并行处理。
- Queue 负责入口缓冲、重试和削峰；同 agent 的顺序性不依赖 Queue consumer 并发配置。
- 同一个 run 内的危险工具不并行执行。
- 只读工具可以并发，但必须受 timeout、rate limit 和 provider 限制约束。

## Mailbox 状态

Durable Object mailbox 会记录事件处理状态，用于幂等和恢复。事件状态只应保留有限窗口，超过保留期后清理，避免 DO storage 无限增长。

保留窗口需要覆盖：

- Queue retry 可能重复投递的时间；
- Worker 或 Durable Object 短暂失败后的恢复时间；
- 排查近期重复事件所需的最小审计窗口。

长期历史应写入 D1 的 runs、messages、tool calls 和 audit logs，而不是留在 DO storage。

## 可观测性

每次运行建议记录：

- inbound event；
- normalized message；
- selected skills；
- model request metadata；
- tool calls；
- permission decisions；
- storage writes；
- outbound messages；
- errors；
- cost/usage。

日志分两类：

- audit log：长期保存，用于追责和排障。
- debug log：短期保存，用于开发调试。

## 相关文档

- [运行流程](RUNTIME_FLOW.md)
- [存储模型](STORAGE_MODEL.md)
- [../PERMISSIONS_RUNTIME.md](../PERMISSIONS_RUNTIME.md)
