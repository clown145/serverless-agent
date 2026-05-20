# QQ Official Gateway Adapter

This adapter implements the QQ official bot gateway flow without the Python
`qq-botpy` SDK:

1. Fetch an app access token with `appId` and `secret`.
2. Fetch `/gateway/bot`.
3. Keep one outbound WebSocket connection in `QQOfficialGatewayDurableObject`.
4. Identify/resume the gateway session and send heartbeats.
5. Normalize QQ gateway events into `InternalMessage` queue jobs.
6. Send replies through QQ HTTP OpenAPI.

The initial implementation opens shard `0` in a named Durable Object. This is
enough for normal single-shard bots. If QQ returns multiple shards for a high
traffic bot, split the object name by shard and create one session per shard.

The code is split by responsibility:

- `api.ts`: QQ HTTP OpenAPI client.
- `gateway-session.ts`: WebSocket lifecycle, identify/resume, heartbeats.
- `gateway-payloads.ts`: gateway protocol payload builders.
- `normalize.ts`: gateway event to internal message conversion.
- `conversation-store.ts`: DO-local conversation target cache for replies.
- `outbound.ts`: platform outbound adapter.
- `keepalive.ts`: scheduled/admin connection management.
