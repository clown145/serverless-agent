# Admin WebUI

## 概览

Admin WebUI 是一个 React + Vite SPA，和 Worker 部署在同一个 Cloudflare 项目下。

访问入口：

```text
/ui
```

WebUI 只负责管理和调试入口，不绕过 agent runtime。浏览器里发送的消息会被转换成 `platform:webui` 的 `InternalMessage`，再进入和 Telegram、QQ、WeCom、Weixin OC 相同的执行链路。

## 运行模型

```text
WebUI
-> /admin/messages
-> webui adapter
-> InternalMessage
-> Queue
-> Agent Durable Object
-> Agent runtime
-> Tool registry
```

这样做的结果是：

- WebUI 可以单独配置 `platform:webui` 权限策略；
- tool call、skill 选择、run 记录和 audit log 复用同一套实现；
- WebUI conversation history 只记录本地管理端会话，不调用外部平台 API。

## 功能范围

当前 WebUI 包含：

- chat 和 conversation history；
- Telegram、QQ Official、WeCom、Weixin OC integration 管理；
- model provider 创建、API key 加密保存、模型刷新和启用；
- runs 列表和 run detail；
- VFS 浏览、读取和写入；
- schedules 创建、查看和取消；
- pending actions 查看和确认；
- permission policies 创建、查看和删除；
- admin token 本地保存。

## 开发命令

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

`npm run dev` 会先构建 WebUI，再启动 `wrangler dev`。前端产物输出到 `apps/admin-web/dist`，由 Wrangler assets binding 提供服务。

## 安全说明

如果配置了 `INTERNAL_ADMIN_TOKEN`，WebUI 的 System 页面需要填写 token，后续 `/admin/*` 请求会带上 `Authorization: Bearer <token>`。

浏览器本地保存的 admin token 只用于本机调试和访问当前部署，不应该写入仓库或文档示例。

## 相关文档

- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)
- [PERMISSIONS_RUNTIME.md](PERMISSIONS_RUNTIME.md)
- [MODEL_PROVIDERS.md](MODEL_PROVIDERS.md)
