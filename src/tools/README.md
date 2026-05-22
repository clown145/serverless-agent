# Tools

agent 可调用工具都放这里。工具层按来源拆分，registry 只负责统一注册、权限、审计和执行。

## Format

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

- `builtin`: 预置内置工具，例如 VFS、消息发送、未来任务、HTTP API 请求。
- `mcp`: 外部 MCP 工具适配层，内部工具名使用 `mcp.<serverId>.<toolName>`。

## Rules

- 工具必须通过 registry 注册，不允许散落调用。
- 工具输入必须先用 schema 校验。
- 有写入或外部副作用的工具必须声明权限和 side effect。
- MCP 工具错误要映射成工具结果，协议/传输异常才作为 transport error。

## Built-in HTTP

`http.request` 提供类似 cURL 的结构化 HTTP(S) 请求能力。它允许访问公网 API，但会阻断 localhost、私有 IPv4、IPv6 本地地址以及重定向后的私网目标。工具权限为 level 4，scope 为 `http:request`。
