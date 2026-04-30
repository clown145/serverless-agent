import type { PermissionLevel } from "../tools/types";

export type PolicySubjectType = "agent" | "user" | "role" | "platform" | "conversation";

export type ResolvedPolicy = {
  maxLevel: PermissionLevel;
  scopes: string[];
  sources: string[];
};

export type PolicyCheck = {
  allowed: boolean;
  reason?: string;
  resolved: ResolvedPolicy;
};
