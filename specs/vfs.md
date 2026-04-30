# VFS Spec

VFS 是 agent 的虚拟文件系统。它不是 Worker 的真实文件系统，而是 R2 + D1 的抽象。

## 路径空间

```text
/workspace/
/workspace/notes/
/workspace/tasks/
/workspace/memory/
/skills/
/artifacts/
/inbox/
/outbox/
```

## VfsEntry

```ts
type VfsEntry = {
  id: string
  agentId: string
  path: string
  kind: "file" | "directory"
  r2Key?: string
  mimeType?: string
  size?: number
  checksum?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
```

## 操作

```ts
listDir(path): Promise<VfsEntry[]>
readFile(path): Promise<VfsFile>
writeFile(path, content, options): Promise<VfsEntry>
deletePath(path): Promise<void>
movePath(source, target): Promise<VfsEntry>
stat(path): Promise<VfsEntry>
```

## 路径规则

- 必须以 `/` 开头。
- 连续 `/` 要归一化。
- 禁止 `..`。
- 禁止空字节。
- 禁止越过 agent root。
- `/skills` 默认只允许受控写入。
- 删除目录必须显式 recursive。

## 存储规则

- D1 保存 entry metadata。
- R2 保存 file content。
- directory 没有 R2 object。
- 大文件可以分块或直接拒绝，第一版先限制大小。

## 审计

写操作必须记录：

- actor。
- path。
- operation。
- previous checksum。
- new checksum。
- run_id。
- timestamp。
