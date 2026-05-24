import { QQ_OPCODE } from "./types";
import type { QqOfficialGatewayIntent, QqOfficialGatewayPayload } from "./types";

export type QqOfficialIdentifyInput = {
  token: string;
  intents: QqOfficialGatewayIntent;
  shardId: number;
  shardCount: number;
};

export type QqOfficialResumeInput = {
  token: string;
  sessionId: string;
  seq: number;
};

export function createQqOfficialIdentifyPayload(
  input: QqOfficialIdentifyInput
): QqOfficialGatewayPayload {
  return {
    op: QQ_OPCODE.identify,
    d: {
      token: input.token,
      intents: input.intents,
      shard: [input.shardId, input.shardCount]
    }
  };
}

export function createQqOfficialResumePayload(
  input: QqOfficialResumeInput
): QqOfficialGatewayPayload {
  return {
    op: QQ_OPCODE.resume,
    d: {
      token: input.token,
      session_id: input.sessionId,
      seq: input.seq
    }
  };
}

export function createQqOfficialHeartbeatPayload(
  seq: number | undefined
): QqOfficialGatewayPayload {
  return {
    op: QQ_OPCODE.heartbeat,
    d: seq ?? 0
  };
}
