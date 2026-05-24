# Shared

## 概览

`shared` 存放跨模块共享的小型类型、常量、错误类和纯函数。

## 允许

- 共享类型。
- 稳定常量。
- 错误类。
- 无副作用的小型纯函数。

## 禁止

- 业务流程。
- 平台 adapter。
- tool executor。
- storage repository。
- Cloudflare binding 访问。

## 约束

如果一个 helper 只被单个模块使用，应留在该模块内。只有真正跨模块、语义稳定的类型或函数才放入 `shared`。

## 相关文档

- [../../docs/DEVELOPMENT_GUIDE.md](../../docs/DEVELOPMENT_GUIDE.md)
