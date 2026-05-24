# VFS Spec

## 概览

VFS 是 agent 的虚拟文件系统。它不是 Worker 的真实文件系统，而是 D1 metadata、D1 小文本内容和 object-storage blob 组成的 workspace 抽象。

## 路径空间

```text
/system/
/system/skills/
/system/prompts/
/system/tool-specs/
/user/
/user/skills/
/user/memory/
/user/preferences/
/workspace/
/workspace/tasks/
/workspace/artifacts/
/workspace/scratch/
/workspace/inbox/
/workspace/notes/
/skills/
```

## VfsEntry

```ts
type VfsEntry = {
  id: string;
  agentId: string;
  path: string;
  kind: "file" | "directory";
  storageKind: "d1_text" | "r2_blob" | "legacy_r2" | "directory";
  // Historical field name. The value is an object-storage key, not necessarily R2.
  r2Key?: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
```

## 操作

```ts
listDir(path): Promise<VfsEntry[]>
readFile(path): Promise<VfsFile>
writeFile(path, content, options): Promise<VfsEntry>
mkdir(path): Promise<VfsEntry>
deletePath(path): Promise<void>
movePath(source, target): Promise<VfsEntry>
search(path, query): Promise<VfsSearchMatch[]>
command(command, cwd): Promise<VfsCommandResult>
initializeWorkspace(): Promise<VfsWorkspaceBootstrapStatus>
```

## 路径规则

- 必须以 `/` 开头。
- 连续 `/` 要归一化。
- 工具 API 路径禁止 `..`。
- 虚拟命令可以使用相对路径和 `..`，但解析后不能越过 `/`。
- 禁止空字节。
- 禁止越过 agent root。
- `/skills` 默认只允许受控写入。
- 删除目录必须显式 recursive。

## 存储规则

- D1 保存 entry metadata。
- 小文本/JSON 内容直接保存到 `vfs_contents`。
- 大文件和二进制内容保存到对象存储 content-addressed blob。
- 写入会递增 `version` 并记录 `vfs_revisions`。
- directory 没有 object storage object。
- object storage blob 不按路径覆盖，避免高频重写同一个 object key。
- 当前对象存储后端可以是 R2、S3-compatible 或 D1 lite。
- `d1_lite` 只适合小对象。

## 审计

写操作必须记录：

- actor；
- path；
- operation；
- previous checksum；
- new checksum；
- run_id；
- timestamp。

## 相关文档

- [../docs/architecture/STORAGE_MODEL.md](../docs/architecture/STORAGE_MODEL.md)
- [../src/tools/vfs/README.md](../src/tools/vfs/README.md)
