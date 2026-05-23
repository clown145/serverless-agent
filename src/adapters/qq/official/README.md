# QQ Official Adapter

This adapter implements QQ official bot support without the Python `qq-botpy`
SDK. It supports two inbound modes:

- `gateway`: keep one outbound QQ Gateway WebSocket in
  `QQOfficialGatewayDurableObject`.
- `webhook`: receive QQ official callbacks at
  `/webhooks/qq-official/:webhookSecret` and send replies directly through QQ
  OpenAPI.

Gateway mode flow:

1. Fetch an app access token with `appId` and `secret`.
2. Fetch `/gateway/bot`.
3. Keep one outbound WebSocket connection in `QQOfficialGatewayDurableObject`.
4. Identify/resume the gateway session and send heartbeats.
5. Normalize QQ gateway events into `InternalMessage` queue jobs.
6. Send replies through QQ HTTP OpenAPI.

Webhook mode flow:

1. QQ calls the Worker webhook route.
2. `op=13` validation requests are answered with an Ed25519 signature derived
   from the bot secret.
3. Dispatch events are normalized into `InternalMessage` queue jobs.
4. Conversation targets are stored in D1 so later replies can call QQ OpenAPI
   directly.

The initial implementation opens shard `0` in a named Durable Object. This is
enough for normal single-shard bots. If QQ returns multiple shards for a high
traffic bot, split the object name by shard and create one session per shard.

The code is split by responsibility:

- `api.ts`: QQ HTTP OpenAPI client.
- `gateway-session.ts`: WebSocket lifecycle, identify/resume, heartbeats.
- `gateway-payloads.ts`: gateway protocol payload builders.
- `normalize.ts`: gateway event to internal message conversion.
- `conversation-store.ts`: DO-local conversation target cache for gateway replies.
- `direct-sender.ts`: direct OpenAPI sender used by webhook mode.
- `webhook.ts`: QQ official webhook event handling.
- `webhook-validation.ts`: QQ webhook validation signature.
- `outbound.ts`: platform outbound adapter.
- `keepalive.ts`: scheduled/admin connection management.
