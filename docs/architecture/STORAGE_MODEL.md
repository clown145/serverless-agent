# Storage Model

## D1

D1 用于结构化数据：

- agents
- platform_accounts
- conversations
- messages
- runs
- run_steps
- tool_calls
- schedules
- permissions
- audit_logs
- vfs_entries

## R2

R2 用于对象内容：

- workspace 文件。
- skills 文件。
- artifacts。
- attachments。
- 大型日志。

推荐 key：

```text
agents/{agent_id}/vfs/workspace/{path}
agents/{agent_id}/vfs/skills/{skill_id}/{path}
runs/{run_id}/artifacts/{name}
attachments/{platform}/{message_id}/{name}
```

## KV

KV 只用于缓存和小配置：

- 平台 token 缓存引用。
- 热门 skill manifest。
- 临时去重键。
- 低风险 feature flag。

KV 不作为强一致核心状态库。

## Durable Object Storage

Durable Object storage 用于单个 agent 的局部状态：

- 当前锁。
- heartbeat 状态。
- 最近 run 指针。
- alarm 状态。
- 短期工作状态。

长期历史仍写入 D1/R2。

## VFS

Worker 的真实文件系统不是持久工作区。项目的 VFS 是 R2 + D1 实现的抽象。

```text
readFile(path)
writeFile(path, content)
listDir(path)
stat(path)
deleteFile(path)
move(path, target)
```

VFS 约束：

- 所有路径必须归一化。
- 禁止 `..` 越权。
- 每个 agent 有独立根目录。
- 大文件走 R2。
- metadata 写 D1。
- 操作写 audit log。
