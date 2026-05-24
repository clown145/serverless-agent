# Model Providers

## 概览

agent 通过 `src/core/model` 使用 provider-neutral 的模型接口。运行时不把 OpenAI、Gemini 或 mock provider 的协议细节暴露给 agent core 之外的模块。

当前支持：

- `mock`：本地确定性 provider，用于开发和测试。
- `openai`：OpenAI-compatible Chat Completions provider。
- `gemini`：Gemini `generateContent` provider。

## 配置来源

生产环境的模型选择存储在 D1。WebUI 的 Models 页面可以：

- 创建 provider；
- 刷新 provider 可用模型；
- 选择当前 agent 使用的 active model。

Provider API key 在 WebUI 输入后会加密存入 D1。加密 key 优先使用 `AGENT_MASTER_KEY`；如果未设置，会回退到 `INTERNAL_ADMIN_TOKEN`，方便新部署先完成初始化。

旧的 secret binding 配置仍作为 fallback 可用。新 provider 记录应优先使用加密 credential。

本地仍支持通过 `.dev.vars` 或 Cloudflare 环境变量设置：

```bash
MODEL_PROVIDER=mock
```

## OpenAI-Compatible

环境变量 fallback：

```bash
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1
OPENAI_BASE_URL=https://api.openai.com/v1
```

WebUI 只要求填写 provider format、API address 和 API key。运行时默认值：

```text
providerType=openai
authType=bearer
modelListStrategy=openai
chatProtocol=openai-chat-completions
```

`OPENAI_BASE_URL` 可以指向 OpenAI-compatible gateway。运行时会调用：

```text
POST {OPENAI_BASE_URL}/chat/completions
```

工具调用使用 Chat Completions `tools`，返回的 `tool_calls` 会映射回内部工具名。

## Gemini

环境变量 fallback：

```bash
MODEL_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

WebUI 只要求填写 provider format、API address 和 API key。运行时默认值：

```text
providerType=gemini
authType=query-param
authQueryParam=key
modelListStrategy=gemini
chatProtocol=gemini-generate-content
```

运行时会调用：

```text
POST {GEMINI_BASE_URL}/models/{GEMINI_MODEL}:generateContent
```

工具调用使用 Gemini function declarations，并把 `functionCall` / `functionResponse` 映射到同一套内部 tool-call contract。

## 工具名映射

内部工具名使用 dotted name：

```text
vfs.read_file
messaging.send_message
```

Provider-facing 工具名会被转换为安全形式：

```text
vfs_read_file
messaging_send_message
```

执行工具时，mapper 会恢复内部工具名。

## 本地 mock

使用 `MODEL_PROVIDER=mock` 后，可以发送一条同步消息：

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","mode":"sync"}'
```

mock provider 也支持一个简单的 VFS 写入命令：

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"/write /workspace/notes/a.md hello","mode":"sync"}'
```

## Admin API

查看 provider、cached model catalog 和 active setting：

```bash
curl -sS http://localhost:8787/admin/model-settings
```

创建 provider：

```bash
curl -sS http://localhost:8787/admin/model-settings \
  -H 'content-type: application/json' \
  -d '{"name":"OpenAI","providerType":"openai","baseUrl":"https://api.openai.com/v1","apiKey":"sk-..."}'
```

刷新模型列表：

```bash
curl -sS -X POST http://localhost:8787/admin/model-providers/mprov_.../refresh
```

启用模型：

```bash
curl -sS -X PUT http://localhost:8787/admin/model-settings \
  -H 'content-type: application/json' \
  -d '{"providerId":"mprov_...","modelId":"gpt-4.1"}'
```

如果配置了 `INTERNAL_ADMIN_TOKEN`，这些接口需要 admin token。

## 相关文档

- [ADMIN_WEBUI.md](ADMIN_WEBUI.md)
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)
- [architecture/TOOLS_AND_BOUNDARIES.md](architecture/TOOLS_AND_BOUNDARIES.md)
