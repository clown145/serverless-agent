# Storage

## 概览

`storage` 是持久化访问层，收敛 D1、object storage、KV 和 DO storage 细节。

## 职责

- D1 repositories。
- Object storage store。
- KV cache helper。
- Durable Object storage helper。
- key/path builders。
- credential 加密存储相关访问。

## 边界

业务代码不直接写 SQL、不直接拼 object key、不把 D1 row shape 泄露到不需要知道的模块。

## 相关文档

- [../../docs/architecture/STORAGE_MODEL.md](../../docs/architecture/STORAGE_MODEL.md)
- [../../specs/vfs.md](../../specs/vfs.md)
