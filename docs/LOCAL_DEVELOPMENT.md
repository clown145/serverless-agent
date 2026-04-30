# Local Development

## Install

```bash
npm install
```

## Validate

```bash
npm run typecheck
npm test
npm run dry-run
```

## Apply Local D1 Migrations

```bash
npm run db:migrate:local
```

This applies SQL files from `infra/cloudflare/migrations`.

## Start Worker

```bash
npm run dev
```

## Trigger A Local Admin Run

Use sync mode when developing. It sends the event directly to the Durable Object and returns the `runId`.

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","mode":"sync"}'
```

If your shell has proxy variables configured and local requests hang, add:

```bash
NO_PROXY=127.0.0.1,localhost curl --noproxy '*' ...
```

Expected shape:

```json
{
  "ok": true,
  "eventId": "evt_...",
  "result": {
    "handled": true,
    "runId": "run_..."
  }
}
```

Then inspect the run:

```bash
curl -sS http://localhost:8787/admin/runs/run_...
```

## Manage VFS Files

Write a file:

```bash
curl -sS -X PUT http://localhost:8787/admin/vfs \
  -H 'content-type: application/json' \
  -d '{"path":"/workspace/notes/hello.md","content":"hello"}'
```

List a directory:

```bash
curl -sS 'http://localhost:8787/admin/vfs?path=/workspace/notes'
```

Read a file:

```bash
curl -sS 'http://localhost:8787/admin/vfs?mode=file&path=/workspace/notes/hello.md'
```

## Queue Mode

Production-like mode uses the Queue binding:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"hello","mode":"queue"}'
```

If `mode` is omitted, the API defaults to queue mode.

## Admin Token

If `INTERNAL_ADMIN_TOKEN` is configured, admin routes require:

```bash
Authorization: Bearer <token>
```
