# MCP Tools

MCP support is split into small layers:

- `http-client.ts`: high-level initialize, `tools/list` discovery, and `tools/call`.
- `http-transport.ts`: JSON-RPC over Streamable HTTP, including SSE response parsing.
- `adapter.ts`: wraps discovered MCP tools as registry tools.
- `credential.ts`: encrypts and decrypts MCP server credentials.
- `types.ts`: protocol-facing MCP tool/result types.

Current status: WebUI can save MCP servers, cache discovered tools, enable them, and expose enabled MCP tools to the agent runtime.
