# Tests

## 概览

`tests` 当前以单元测试为主。集成测试和 fixtures 目录尚未建立，新增时需要在本文件补充运行前置条件。

## 目录

```text
tests/
  unit/
```

## 优先覆盖

- adapter normalize。
- VFS path normalization。
- permission policy。
- tool idempotency。
- run state transition。
- schedule due-time calculation。
- storage key builder。
- Durable Object mailbox 清理和恢复。

## 运行

```bash
npm test
```

类型检查：

```bash
npm run typecheck
```

## 相关文档

- [../docs/DEVELOPMENT_GUIDE.md](../docs/DEVELOPMENT_GUIDE.md)
