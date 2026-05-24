# Search Tools

## 概览

`search.web` 是标准 Web search 工具。工具本身 provider-neutral，运行时从 `search_settings` 读取 active provider。

## 当前 provider

- `tavily`：`POST /search`，Bearer auth。
- `exa`：`POST /search`，`x-api-key` auth。

## 扩展点

| 文件 | 职责 |
| --- | --- |
| `provider-types.ts` | Provider interface 和 normalized result shape。 |
| `provider-factory.ts` | Active provider resolution。 |
| `<provider>-provider.ts` | Provider-specific HTTP adapter。 |
| `storage/repositories/search-*` | Provider config、credential 和 active setting storage。 |

## 权限

通用 Web 搜索属于外部 API 权限，默认 scope 是 `web:search`。

## 相关文档

- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
