# Admin WebUI

Admin WebUI 是一个 React + Vite SPA，部署在同一个 Cloudflare Worker 下。

访问入口：

```text
/ui
```

## Runtime Model

WebUI 的对话入口不是单独 agent pipeline。它通过 `/admin/messages` 创建 `platform:webui` 的 `InternalMessage`，然后和 Telegram、QQ、WeCom、Weixin OC 等入口共用后续流程：

```text
WebUI
-> /admin/messages
-> webui adapter
-> InternalMessage
-> Queue / Durable Object
-> Agent runner
-> Tool registry
```

这样权限策略可以按 `platform:webui` 单独配置，同时工具调用、skill 选择、run 记录和审计日志都复用现有系统。

## Features

第一版控制台包含：

- WebUI chat。
- WebUI conversation history, including agent replies sent through `messaging.send_message`。
- Telegram platform integration creation, bot test, command sync, and webhook setup.
- QQ Official integration creation, webhook/gateway mode selection, connection control, status, and test.
- WeCom integration creation, credential test, and contact way generation.
- Weixin OC integration creation, QR login, connection control, and status.
- model providers 创建、加密保存 API key、刷新和启用模型。
- runs 列表和 run detail。
- VFS 浏览、读取、写入。
- schedules 创建、查看、取消。
- pending actions 查看、确认。
- permission policies 创建、查看、删除。
- admin token 本地保存。

## Development

构建前端：

```bash
npm run admin:build
```

单独启动 Vite：

```bash
npm run admin:dev
```

启动完整 Worker：

```bash
npm run dev
```

`npm run dev` 会先构建 WebUI，再启动 `wrangler dev`。前端产物输出到 `apps/admin-web/dist`，由 Wrangler assets 绑定提供服务。

如果配置了 `INTERNAL_ADMIN_TOKEN`，WebUI 的 System 页面需要填写 token。
