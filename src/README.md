# 源码结构

## 概览

`src` 是 Worker runtime 源码目录。代码按运行职责拆分，平台接入、agent core、tools、storage 和 VFS 不互相混放。

## 主要目录

| 路径 | 职责 |
| --- | --- |
| `worker/` | HTTP routes、Queue consumer、Cron handler、admin API。 |
| `agents/` | Durable Object coordinator、mailbox、alarm 和 run 恢复。 |
| `adapters/` | Telegram、QQ、WeCom、Weixin OC、WebUI/Admin 协议适配。 |
| `commands/` | slash/system command 解析、注册和执行分发。 |
| `context/` | conversation context、附件 caption 等上下文加载逻辑。 |
| `conversations/` | conversation ID 生成和解析。 |
| `core/` | 平台无关的 agent loop、model provider、context 和 tool-call flow。 |
| `diagnostics/` | 配置检查和 runtime checks。 |
| `media/` | 附件持久化和 media object key helper。 |
| `platforms/` | 平台能力、outbound registry、gateway DO wrappers 和 context hints。 |
| `tools/` | 模型可调用工具、registry、schema、权限和执行器。 |
| `storage/` | D1 repositories、object storage、KV/DO storage helpers。 |
| `vfs/` | 虚拟文件系统的 path、service、storage 和 command 层。 |
| `scheduler/` | schedules、Cron sweep、heartbeat 和 retry。 |
| `skills/` | `SKILL.md` frontmatter、skill loader 和 skill service。 |
| `permissions/` | permission policy 和 pending action runtime。 |
| `observability/` | audit log、debug log、trace 和 metrics。 |
| `security/` | 加密、secret 和安全 helper。 |
| `setup/` | 初始配置状态检查。 |
| `shared/` | 共享类型、常量、错误类和小型纯函数。 |

## 依赖规则

- `core` 不直接依赖具体平台协议。
- `adapters` 不调用模型，不决定 agent 行为。
- `tools` 通过 registry 暴露能力，不绕过权限和审计。
- `storage` 收敛 SQL、object key 和持久化细节。
- `shared` 保持小而稳定，不能变成业务杂物目录。

## 相关文档

- [../docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md)
- [../docs/DEVELOPMENT_GUIDE.md](../docs/DEVELOPMENT_GUIDE.md)
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
