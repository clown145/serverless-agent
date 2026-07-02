# 存储模型

## 概览

运行时把结构化状态、文件内容、缓存和短期协调状态放在不同存储里。D1 是结构化数据来源，Object Storage 保存较大内容，KV 只做缓存，DO storage 只保存局部协调状态。

## D1

D1 用于结构化数据：

- agents
- platform_accounts / platform_integrations
- conversations
- messages
- email_messages
- runs
- run_steps
- tool_calls
- schedules
- permission_policies
- pending_actions
- audit_logs
- vfs_entries
- vfs_contents
- vfs_revisions
- vfs_mounts

D1 适合查询、审计、撤销和跨实例恢复。

## Object Storage

对象存储用于较大的非结构化内容：

- workspace 文件；
- skills 文件；
- artifacts；
- attachments；
- raw email `.eml`；
- 大型日志或导出内容。

支持后端：

- `r2`：默认后端，使用 Cloudflare R2 binding。
- `s3`：S3-compatible 后端，通过预签名请求访问外部对象存储。
- `d1_lite`：最低可用后备模式，把小对象写入 D1，单对象上限 256KB。

推荐 key：

```text
agents/{agent_id}/vfs/blobs/sha256/{prefix}/{shard}/{checksum}
runs/{run_id}/artifacts/{name}
attachments/{platform}/{message_id}/{name}
email/{agent_id}/{integration_id}/raw/{email_message_id}.eml
```

对象内容应尽量 content-addressed，避免高频覆盖同一个 object key。

## KV

KV 当前只用于 runtime diagnostics 验证绑定可读写。后续可用于缓存和小配置，例如：

- platform metadata cache；
- skill catalog cache；
- 临时 dedupe key；
- 低风险 feature flag。

这些缓存项目前不是核心路径的依赖；skill catalog 仍从 VFS/D1 读取。KV 不作为强一致核心状态库。

## Durable Object Storage

Durable Object storage 用于单个 Durable Object 的局部状态：

- 当前锁；
- mailbox event state；
- heartbeat 状态；
- 最近 run 指针；
- alarm 状态；
- 平台 gateway session 游标。

DO storage 不应该保存无限增长的长期历史。长期数据应进入 D1 和对象存储；短期状态需要保留期和清理策略。

## VFS

Worker 的真实文件系统不是持久工作区。VFS 是 D1-first + object-storage blob 的 workspace 抽象。

核心操作：

```text
readFile(path)
writeFile(path, content)
listDir(path)
mkdir(path)
delete(path)
move(path, target)
search(path, query)
command("ls /workspace")
initializeWorkspace()
```

VFS 约束：

- 所有路径必须归一化；
- 工具 API 禁止 `..`；
- 虚拟命令可以解析相对路径，但不能越过 `/`；
- 每个 agent 有独立根目录；
- 小文本和 JSON 内容写 D1；
- 大文件和二进制内容走对象存储 content-addressed blob；
- `d1_lite` 只适合小对象；
- metadata、版本号和 revision 写 D1；
- 默认 workspace 初始化是幂等操作；
- 写操作记录 audit log。

## 相关文档

- [../PLATFORM_CLOUDFLARE.md](../PLATFORM_CLOUDFLARE.md)
- [../../specs/vfs.md](../../specs/vfs.md)
- [FAILURE_AND_CONCURRENCY.md](FAILURE_AND_CONCURRENCY.md)
