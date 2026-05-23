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

Production deploy is handled by GitHub Actions. See [GITHUB_ACTIONS_DEPLOY.md](GITHUB_ACTIONS_DEPLOY.md).

## Apply Local D1 Migrations

```bash
npm run db:migrate:local
```

This applies SQL files from `infra/cloudflare/migrations`.

## Start Worker

```bash
npm run dev
```

The admin console is available at:

```text
http://localhost:8787/ui
```

Build or develop only the WebUI:

```bash
npm run admin:build
npm run admin:dev
```

## Trigger A Local Admin Run

Use sync mode when developing. It sends the event directly to the Durable Object and returns the `runId`.

The default local model provider is `mock`, configured in `wrangler.toml`.

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","mode":"sync"}'
```

WebUI sends the same endpoint with `platform:webui`:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"platform":"webui","conversationId":"webui:default","text":"/ping","mode":"sync"}'
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

List recent runs:

```bash
curl -sS http://localhost:8787/admin/runs
```

Test a tool call through the mock provider:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/write /workspace/notes/mock.md hello","mode":"sync"}'
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

## Load A Skill From VFS

Create a minimal skill:

```bash
curl -sS -X POST http://localhost:8787/admin/skills \
  -H 'content-type: application/json' \
  -d '{"skillId":"demo","content":"---\nname: Demo\ndescription: Use this skill for demo reads.\n---\n\n# Demo\nUse this skill for demo reads."}'
```

Load it:

```bash
curl -sS http://localhost:8787/admin/skills/demo
```

List skills:

```bash
curl -sS http://localhost:8787/admin/skills
```

Read and edit files through Skill-scoped routes:

```bash
curl -sS 'http://localhost:8787/admin/skills/demo/files'
curl -sS 'http://localhost:8787/admin/skills/demo/files?mode=file&relativePath=SKILL.md'
curl -sS -X PUT http://localhost:8787/admin/skills/demo/files \
  -H 'content-type: application/json' \
  -d '{"relativePath":"references/notes.md","content":"# Notes\n"}'
curl -sS 'http://localhost:8787/admin/skills/demo/revisions?relativePath=SKILL.md'
```

Run it explicitly:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/skill demo /read /workspace/notes/hello.md","mode":"sync"}'
```

Toggle model skill edits:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/skill-auto-edits on","mode":"sync"}'
```

Then:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/skill demo /read /workspace/notes/hello.md","mode":"sync"}'
```

## Queue Mode

Production-like mode uses the Queue binding:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"hello","mode":"queue"}'
```

If `mode` is omitted, the API defaults to queue mode.

## Test Scheduler

Create an immediate one-time schedule:

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/write /workspace/notes/scheduled.md from-schedule","delaySeconds":0}'
```

Trigger the local scheduled handler:

```bash
curl -sS http://localhost:8787/cdn-cgi/handler/scheduled
```

Queue delivery is async. Wait briefly, then read the file:

```bash
curl -sS 'http://localhost:8787/admin/vfs?mode=file&path=/workspace/notes/scheduled.md'
```

Inspect heartbeats:

```bash
curl -sS http://localhost:8787/admin/heartbeats
```

## Manage Permission Policies

Create a policy for a user:

```bash
curl -sS http://localhost:8787/admin/permission-policies \
  -H 'content-type: application/json' \
  -d '{"subjectType":"user","subjectId":"alice","maxLevel":4,"scopes":["workspace:read","workspace:write","message:send"]}'
```

List policies:

```bash
curl -sS http://localhost:8787/admin/permission-policies
```

List pending confirmations:

```bash
curl -sS http://localhost:8787/admin/pending-actions
```

Confirm a pending action:

```bash
curl -sS -X POST http://localhost:8787/admin/pending-actions/act_.../confirm
```

## Admin Token

If `INTERNAL_ADMIN_TOKEN` is configured, admin routes require:

```bash
Authorization: Bearer <token>
```
