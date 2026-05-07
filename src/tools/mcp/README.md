# MCP Tools

MCP support is split into small layers:

- `http-client.ts`: high-level initialize and `tools/list` discovery.
- `http-transport.ts`: JSON-RPC over Streamable HTTP, including SSE response parsing.
- `adapter.ts`: wraps discovered MCP tools as registry tools.
- `credential.ts`: encrypts and decrypts MCP server credentials.
- `types.ts`: protocol-facing MCP tool/result types.

Current status: WebUI can save MCP servers and cache discovered tools. Executing cached MCP tools from the agent loop is intentionally left as the next step.
