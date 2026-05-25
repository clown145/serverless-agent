# 贡献指南

欢迎提交 issue 和 pull request。

## 开发环境

```bash
npm install
npm run db:migrate:local
npm run dev
```

本地开发流程见 [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)。

## 提交 Pull Request 前

请先运行：

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
```

如果改动影响部署流程，也请运行：

```bash
npm run dry-run
```

## 代码约定

- 平台适配器保持轻量，只做平台 payload 解析、校验、规范化和出站协议调用。
- `src/core` 保持平台无关。
- 跨模块共享类型放在 `src/shared/types`。
- storage key、SQL 和对象路径应收敛在 repository 或 storage 模块内。
- mailbox、权限、调度、平台规范化和公开 schema 的变更需要有聚焦测试。

更多约定见 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)。

## 文档约定

- 操作步骤写成短的 how-to 文档。
- 稳定的 API、环境变量和 schema 写成参考文档。
- 架构文档只写职责、边界和失败模式。
- 不要把规划中的能力写成已经实现的能力。
