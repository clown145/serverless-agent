# Search Tool

`search.web` is the standard web search tool. The tool is provider-neutral and reads the active search provider from `search_settings`.

Current provider:

- `tavily`: POST `/search` with Bearer auth.

Provider extension points:

- `provider-types.ts`: shared provider interface and normalized result shape.
- `provider-factory.ts`: active provider resolution.
- `<provider>-provider.ts`: provider-specific HTTP adapter.
- `storage/repositories/search-*`: provider config, credential, and active setting storage.

通用 Web 搜索属于外部 API 权限，默认 scope 是 `web:search`。
