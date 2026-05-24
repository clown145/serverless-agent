# Tests

## 概览

`tests` 存放单元测试、集成测试和 fixtures。当前测试以 `tests/unit` 为主。

## 目录

```text
tests/
  unit/
  integration/
  fixtures/
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
