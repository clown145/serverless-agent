# Model Providers

The agent uses a provider-neutral model contract in `src/core/model`.

Supported providers:

- `mock`: local deterministic provider for development.
- `openai`: OpenAI-compatible Chat Completions provider.
- `gemini`: Gemini `generateContent` provider.

## Configuration

Set `MODEL_PROVIDER` in `.dev.vars` or Cloudflare environment variables.

```bash
MODEL_PROVIDER=mock
```

## OpenAI-Compatible

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1
OPENAI_BASE_URL=https://api.openai.com/v1
```

`OPENAI_BASE_URL` allows OpenAI-compatible gateways. The provider calls:

```text
POST {OPENAI_BASE_URL}/chat/completions
```

It uses Chat Completions `tools` with function definitions, then maps returned `tool_calls` back to internal tool names.

## Gemini

```bash
MODEL_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

The provider calls:

```text
POST {GEMINI_BASE_URL}/models/{GEMINI_MODEL}:generateContent
```

It uses Gemini function declarations and maps `functionCall` / `functionResponse` to the same internal tool-call contract.

## Tool Names

Internal tools use dotted names:

```text
vfs.read_file
messaging.send_message
```

Provider-facing names are sanitized:

```text
vfs_read_file
messaging_send_message
```

The mapper preserves the internal names when executing tools.

## Local Mock Commands

With `MODEL_PROVIDER=mock`:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","mode":"sync"}'
```

The mock provider also supports a simple VFS write command:

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/write /workspace/notes/a.md hello","mode":"sync"}'
```
