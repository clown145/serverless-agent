# MCP Tools

## 概览

`mcp` 目录把外部 MCP server 暴露为内部 tool registry tools。内部工具名使用 `mcp.<serverId>.<toolName>`。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `http-client.ts` | initialize、`tools/list` discovery 和 `tools/call`。 |
| `http-transport.ts` | Streamable HTTP 上的 JSON-RPC，包括 SSE response parsing。 |
| `adapter.ts` | 将发现的 MCP tools 包装为 registry tools。 |
| `credential.ts` | MCP server credentials 加密和解密。 |
| `names.ts` | MCP tool name 映射。 |
| `result.ts` | MCP result 到内部 result 的转换。 |
| `types.ts` | 协议侧 MCP tool/result 类型。 |

## 当前状态

WebUI 可以保存 MCP servers、缓存 discovered tools、启用工具，并把 enabled MCP tools 暴露给 agent runtime。

## 边界

MCP 工具仍然需要走 registry、权限、timeout 和 audit。MCP server 的协议错误应转换为工具结果；连接或传输失败才作为 transport error。

## 相关文档

- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
