# 文件结构

## 概览

仓库按职责边界组织文件。平台适配、agent core、tools、storage、scheduler、security 和 docs 不应混放。

## 顶层结构

```text
serverless-agent/
  apps/
  docs/
  infra/
  scripts/
  specs/
  src/
  tests/
  README.md
```

## 目录职责

| 路径                 | 职责                                               |
| -------------------- | -------------------------------------------------- |
| `apps/admin-web/`    | React + Vite 管理控制台。                          |
| `docs/`              | 操作指南、架构说明、运行时参考和项目说明。         |
| `docs/architecture/` | 更细的架构主题文档。                               |
| `infra/cloudflare/`  | Cloudflare migrations、部署相关配置和说明。        |
| `scripts/`           | 开发辅助脚本。                                     |
| `specs/`             | 内部消息、tool contract、VFS 和 Skill 规范。       |
| `src/`               | Worker runtime 源码。                              |
| `tests/`             | 当前以单元测试为主；集成测试和 fixtures 尚未建立。 |

## src 结构

```text
src/
  worker/
  agents/
  adapters/
  commands/
  context/
  conversations/
  core/
  diagnostics/
  media/
  platforms/
  tools/
  storage/
  permissions/
  scheduler/
  security/
  setup/
  skills/
  vfs/
  observability/
  shared/
```

## 源码边界

| 路径                 | 放什么                                                                          | 不放什么                                             |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/worker/`        | HTTP routes、webhook 入口、admin API、Queue/Cron handler。                      | agent 推理逻辑、平台业务决策、工具实现。             |
| `src/agents/`        | Durable Object coordinator、mailbox、alarm、run 恢复。                          | 平台 payload 细节、对象存储 key 拼接、具体工具 API。 |
| `src/adapters/`      | 平台协议和内部协议互转。                                                        | agent 决策、模型调用、权限策略。                     |
| `src/commands/`      | slash/system command 解析、注册和执行分发。                                     | 平台 webhook、工具底层执行。                         |
| `src/context/`       | conversation context、附件 caption 等上下文加载逻辑。                           | 平台协议解析、模型 provider 实现。                   |
| `src/conversations/` | conversation ID 生成和解析。                                                    | 平台 API 调用。                                      |
| `src/core/`          | 平台无关 agent loop、context、model abstraction、tool-call flow。               | Cloudflare binding、平台 token、D1/R2 细节。         |
| `src/diagnostics/`   | 运行前配置检查和 runtime checks。                                               | 修复配置、写入业务状态。                             |
| `src/media/`         | 附件持久化、平台入站媒体分发和 media object key helper。                        | 平台协议细节、VFS 服务。                             |
| `src/platforms/`     | 平台能力、outbound registry、gateway DO wrappers 和 context hints。             | 具体 adapter normalize 逻辑。                        |
| `src/tools/`         | 模型可调用工具、schema、权限和执行器。                                          | 平台 webhook、agent state machine。                  |
| `src/storage/`       | D1 repositories、object storage、DO storage helpers，以及预留的 KV cache 边界。 | 业务流程和平台适配。                                 |
| `src/permissions/`   | 权限策略解析、pending action 创建和确认执行。                                   | HTTP route、具体工具实现。                           |
| `src/scheduler/`     | schedules、Cron sweep、heartbeat 和 retry policy。                              | 平台消息解析。                                       |
| `src/security/`      | 加密、hash、encoding 和 secret helper。                                         | 业务权限决策。                                       |
| `src/setup/`         | 初始配置状态检查。                                                              | WebUI 表现层。                                       |
| `src/skills/`        | `SKILL.md` frontmatter、skill loader 和管理服务。                               | 用户安装的 skill 内容。                              |
| `src/vfs/`           | VFS path、command、service 和 storage 实现。                                    | 模型工具 registry、平台消息发送。                    |
| `src/observability/` | audit log、debug log、trace 和 metrics。                                        | 业务分支逻辑。                                       |
| `src/shared/`        | 共享类型、常量、错误类、小型纯函数。                                            | 业务流程、adapter、tool、storage 实现。              |

## 放文件的判断规则

- 外部平台 payload：`src/adapters/{platform}`。
- HTTP 路由：`src/worker`。
- agent run 状态：`src/core`。
- Durable Object 生命周期：`src/agents`。
- D1、KV、对象存储：`src/storage`。
- VFS path、虚拟命令和文件服务：`src/vfs`。
- 权限策略和确认请求：`src/permissions`。
- agent 可调用能力：`src/tools/{domain}`。
- 未来任务和心跳：`src/scheduler`。
- Skill frontmatter、加载和管理：`src/skills`。
- 日志和审计：`src/observability`。
- slash/system command：`src/commands`。

如果一个文件看起来同时属于两个目录，通常应拆成平台适配、核心逻辑和持久化访问三个部分。

## 相关文档

- [开发指南](DEVELOPMENT_GUIDE.md)
- [架构概览](ARCHITECTURE.md)
- [src/README.md](../src/README.md)
