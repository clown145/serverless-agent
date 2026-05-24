import { childName, normalizeVfsPath, resolveVfsPath } from "../core/path";
import type { VfsEntry } from "../storage/types";
import { parseCommandLine } from "./parser";
import type { VfsCommandInput, VfsCommandResult, VfsCommandRuntime } from "./types";

export async function executeVfsCommand(
  runtime: VfsCommandRuntime,
  input: VfsCommandInput
): Promise<VfsCommandResult> {
  const args = parseCommandLine(input.command);
  const cwd = normalizeVfsPath(input.cwd ?? "/");
  const command = args[0];

  if (!command) {
    return { command: "", cwd, output: "" };
  }

  switch (command) {
    case "pwd":
      return { command, cwd, output: cwd };
    case "ls":
      return await runLs(runtime, cwd, args);
    case "cat":
      return await runCat(runtime, cwd, args);
    case "tree":
      return await runTree(runtime, cwd, args);
    case "grep":
      return await runGrep(runtime, cwd, args);
    case "mkdir":
      return await runMkdir(runtime, cwd, args);
    case "rm":
      return await runRm(runtime, cwd, args);
    case "mv":
      return await runMv(runtime, cwd, args);
    case "help":
      return {
        command,
        cwd,
        output:
          "pwd\nls [path]\ncat <path>\ntree [path]\ngrep <query> [path]\nmkdir <path>\nrm [-r] <path>\nmv <from> <to>"
      };
    default:
      throw new Error(`Unsupported VFS command: ${command}`);
  }
}

async function runLs(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  const path = resolveVfsPath(cwd, args[1] ?? ".");
  const entries = await runtime.workspace.listDir(path);
  return {
    command: "ls",
    cwd,
    output: entries.map(formatListEntry).join("\n")
  };
}

async function runCat(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  if (!args[1]) {
    throw new Error("cat requires a file path");
  }

  const path = resolveVfsPath(cwd, args[1]);
  const file = await runtime.workspace.readFile(path);
  return { command: "cat", cwd, output: file.content };
}

async function runTree(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  const path = resolveVfsPath(cwd, args[1] ?? ".");
  const entries = await runtime.workspace.listTree(path, 500);
  return {
    command: "tree",
    cwd,
    output: formatTree(path, entries)
  };
}

async function runGrep(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  const query = args[1];
  if (!query) {
    throw new Error("grep requires a query");
  }

  const path = resolveVfsPath(cwd, args[2] ?? ".");
  const matches = await runtime.workspace.search({ path, query, limit: 50 });
  return {
    command: "grep",
    cwd,
    output: matches
      .map((match) =>
        match.line
          ? `${match.path}:${match.line}: ${match.preview}`
          : `${match.path}: ${match.preview}`
      )
      .join("\n")
  };
}

async function runMkdir(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  if (!args[1]) {
    throw new Error("mkdir requires a directory path");
  }

  const path = resolveVfsPath(cwd, args[1]);
  const entry = await runtime.workspace.mkdir(path);
  return {
    command: "mkdir",
    cwd,
    output: `created ${entry.path}`
  };
}

async function runRm(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  const recursive = args.includes("-r") || args.includes("--recursive");
  const pathArg = args.find((arg, index) => index > 0 && !arg.startsWith("-"));
  if (!pathArg) {
    throw new Error("rm requires a path");
  }

  const path = resolveVfsPath(cwd, pathArg);
  const result = await runtime.workspace.delete({ path, recursive });
  return {
    command: "rm",
    cwd,
    output: `deleted ${result.deleted} entr${result.deleted === 1 ? "y" : "ies"}`
  };
}

async function runMv(
  runtime: VfsCommandRuntime,
  cwd: string,
  args: string[]
): Promise<VfsCommandResult> {
  if (!args[1] || !args[2]) {
    throw new Error("mv requires source and target paths");
  }

  const entry = await runtime.workspace.move({
    fromPath: resolveVfsPath(cwd, args[1]),
    toPath: resolveVfsPath(cwd, args[2])
  });

  return {
    command: "mv",
    cwd,
    output: `moved to ${entry.path}`
  };
}

function formatListEntry(entry: VfsEntry): string {
  const suffix = entry.kind === "directory" ? "/" : "";
  const size = entry.kind === "file" && entry.size !== undefined ? ` ${entry.size}b` : "";
  return `${childName(entry.path)}${suffix}${size}`;
}

function formatTree(rootPath: string, entries: VfsEntry[]): string {
  const root = normalizeVfsPath(rootPath);
  const lines = [root === "/" ? "/" : childName(root)];
  const rootPrefixLength = root === "/" ? 1 : root.length + 1;

  for (const entry of entries) {
    if (entry.path === root) {
      continue;
    }

    const relativePath = entry.path.slice(rootPrefixLength);
    const depth = relativePath.split("/").length - 1;
    const suffix = entry.kind === "directory" ? "/" : "";
    lines.push(`${"  ".repeat(depth)}${childName(entry.path)}${suffix}`);
  }

  return lines.join("\n");
}
