# Agents

## 概览

`agents` 放 Durable Object coordinator。它负责同一 agent 的任务串行化、mailbox、alarm 和恢复。

## 职责

- 接收 Queue 或 sync mode 投递的事件。
- 将事件写入 Durable Object mailbox。
- 串行 drain 同一 agent 的 mailbox。
- 调用 core runtime 执行 run。
- 管理 alarm、heartbeat 和短期恢复状态。
- 清理超过保留期的 mailbox event state。

## 边界

这里不处理平台 payload 细节、不拼对象存储 key、不实现具体工具 API，也不保存无限增长的长期历史。

## 相关文档

- [../../docs/architecture/RUNTIME_FLOW.md](../../docs/architecture/RUNTIME_FLOW.md)
- [../../docs/architecture/FAILURE_AND_CONCURRENCY.md](../../docs/architecture/FAILURE_AND_CONCURRENCY.md)
