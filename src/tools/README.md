# Tools

## 概览

`tools` 放 agent 可调用工具。工具层通过 registry 统一暴露能力，并在执行前经过 schema、权限、平台可用性和审计处理。

## Tool Definition

工具定义使用接近 MCP `Tool` 的标准字段：

- `name`
- `title`
- `description`
- `inputSchema`
- `outputSchema`
- `annotations`

运行时字段独立保留：

- `source`
- `permission`
- `sideEffect`
- `timeoutMs`
- `execute`

## Sources

- `builtin`：预置内置工具，例如 VFS、消息发送、schedule、HTTP API 请求。
- `mcp`：外部 MCP 工具适配层，内部工具名使用 `mcp.<serverId>.<toolName>`。

## 规则

- 工具必须通过 registry 注册。
- 工具输入必须先用 schema 校验。
- 有写入或外部副作用的工具必须声明权限和 side effect。
- MCP 工具错误应映射成工具结果；协议或传输异常才作为 transport error。
- 工具层不直接包含平台 payload 细节，平台能力差异通过 outbound adapter 或 platform availability 处理。

## 内置工具域

| 路径         | 工具域                       |
| ------------ | ---------------------------- |
| `vfs/`       | 虚拟文件系统工具。           |
| `messaging/` | 平台消息发送工具。           |
| `schedule/`  | 未来任务和周期任务工具。     |
| `search/`    | Web search provider 工具。   |
| `web/`       | 页面读取和正文抽取工具。     |
| `http/`      | 高权限结构化 HTTP 请求工具。 |
| `skills/`    | Skill 管理工具。             |
| `time/`      | 当前时间和时区查询工具。     |
| `mcp/`       | MCP server 工具适配。        |
| `email/`     | 邮件工具边界。               |
| `git/`       | Git provider API 工具边界。  |

## 相关文档

- [../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
- [../../specs/tool-contract.md](../../specs/tool-contract.md)
