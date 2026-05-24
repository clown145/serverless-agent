# Git Tools

## 概览

Git 工具通过 GitHub/GitLab API 实现，不执行本地 `git` 命令。

## 支持方向

- 读取 repo tree。
- 读取文件内容。
- 同步 skills 到 VFS。
- 对比 commit sha。
- 创建 commit 或 PR。

## 边界

不支持：

- 本地 checkout；
- 本地 merge/rebase；
- shell hook；
- 大型仓库完整构建。

## 相关文档

- [../../../docs/architecture/TOOLS_AND_BOUNDARIES.md](../../../docs/architecture/TOOLS_AND_BOUNDARIES.md)
