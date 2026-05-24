# Core

## 概览

`core` 是平台无关的 agent runtime。它处理 context、model provider、tool-call loop 和 run 状态，不包含具体平台协议。

## 职责

- run state machine。
- context builder。
- model provider abstraction。
- tool-call dispatcher interface。
- skill selection。
- runtime-managed final reply。
- run recovery 相关纯逻辑。

## 边界

`core` 不能直接依赖 Telegram、QQ、WeCom、Weixin OC、D1、R2 或 Cloudflare binding 细节。平台格式、存储访问和出站消息格式应通过 adapter、storage、tools 或 shared interface 注入。

## 相关文档

- [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [../../docs/architecture/RUNTIME_FLOW.md](../../docs/architecture/RUNTIME_FLOW.md)
