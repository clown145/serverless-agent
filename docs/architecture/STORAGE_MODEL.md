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
- vfs_contents
- vfs_revisions
- vfs_mounts

## Object Storage

对象存储用于较大的非结构化内容：

- workspace 文件。
- skills 文件。
- artifacts。
- attachments。
- 大型日志。

支持的后端：

- `r2`：默认后端，使用 Cloudflare R2 binding。
- `s3`：S3-compatible 后端，通过预签名请求访问外部对象存储。
- `d1_lite`：最低可用后备模式，把小对象写入 D1，单对象上限 256KB。

推荐 key：

```text
agents/{agent_id}/vfs/blobs/sha256/{prefix}/{shard}/{checksum}
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

长期历史仍写入 D1 和对象存储。

## VFS

Worker 的真实文件系统不是持久工作区。项目的 VFS 是 D1-first +
object-storage blob 实现的抽象。

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

- 所有路径必须归一化。
- 工具 API 禁止 `..`，命令层可解析相对路径但不能越过 `/`。
- 每个 agent 有独立根目录。
- 小文本和 JSON 内容写 D1。
- 大文件和二进制内容走对象存储 content-addressed blob。
- `d1_lite` 只适合小对象，不能作为大附件或大 artifact 的完整替代。
- metadata、版本号和 revision 写 D1。
- 默认 workspace 初始化是幂等操作，只补齐缺失目录。
- 操作写 audit log。
