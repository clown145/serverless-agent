import type { PermissionLevel, ToolExecutionContext } from "../tools/types";
import type { ResolvedPolicy } from "./policy-types";

const OWNER_SCOPES = [
  "workspace:read",
  "workspace:write",
  "message:send",
  "message:send_file",
  "message:send_image",
  "message:send_buttons",
  "web:search",
  "http:request",
  "schedule:read",
  "schedule:write"
];
const MEMBER_SCOPES = ["workspace:read", "workspace:write"];
const UNKNOWN_SCOPES = ["workspace:read"];

export function resolveDefaultPolicy(context: ToolExecutionContext): ResolvedPolicy {
  if (context.actorId === "scheduler") {
    return policy(3, OWNER_SCOPES, "default:scheduler");
  }

  if (context.actorRole === "owner" || context.actorRole === "admin") {
    return policy(4, OWNER_SCOPES, `default:role:${context.actorRole}`);
  }

  if (context.actorRole === "member") {
    return policy(2, MEMBER_SCOPES, "default:role:member");
  }

  return policy(1, UNKNOWN_SCOPES, "default:unknown");
}

function policy(maxLevel: PermissionLevel, scopes: string[], source: string): ResolvedPolicy {
  return {
    maxLevel,
    scopes,
    sources: [source]
  };
}
