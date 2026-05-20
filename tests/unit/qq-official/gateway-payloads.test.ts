import { describe, expect, it } from "vitest";
import {
  createQqOfficialHeartbeatPayload,
  createQqOfficialIdentifyPayload,
  createQqOfficialResumePayload
} from "../../../src/adapters/qq/official/gateway-payloads";
import { QQ_OPCODE } from "../../../src/adapters/qq/official/types";

describe("QQ official gateway payload builders", () => {
  it("creates identify payloads", () => {
    expect(
      createQqOfficialIdentifyPayload({
        token: "QQBot token",
        intents: 123,
        shardId: 0,
        shardCount: 2
      })
    ).toEqual({
      op: QQ_OPCODE.identify,
      d: {
        token: "QQBot token",
        intents: 123,
        shard: [0, 2]
      }
    });
  });

  it("creates resume payloads", () => {
    expect(
      createQqOfficialResumePayload({
        token: "QQBot token",
        sessionId: "session",
        seq: 42
      })
    ).toEqual({
      op: QQ_OPCODE.resume,
      d: {
        token: "QQBot token",
        session_id: "session",
        seq: 42
      }
    });
  });

  it("creates heartbeat payloads", () => {
    expect(createQqOfficialHeartbeatPayload(undefined)).toEqual({
      op: QQ_OPCODE.heartbeat,
      d: 0
    });
    expect(createQqOfficialHeartbeatPayload(9)).toEqual({
      op: QQ_OPCODE.heartbeat,
      d: 9
    });
  });
});
