import type { Env } from "../shared/types/env";
import { handleAgentEvent } from "./agent-event-handler";
import {
  claimNextMailboxEvent,
  completeMailboxEvent,
  failMailboxEvent,
  type MailboxClaimOptions,
  type RunningMailboxEvent,
  recoverStaleRunningEvent
} from "./agent-mailbox";

export type DrainMailboxResult = {
  processed: number;
};

export type DrainMailboxHandler = (
  state: DurableObjectState,
  env: Env,
  item: RunningMailboxEvent
) => Promise<Awaited<ReturnType<typeof handleAgentEvent>>>;

export async function drainAgentMailbox(
  state: DurableObjectState,
  env: Env,
  handler: DrainMailboxHandler = defaultDrainMailboxHandler,
  options: MailboxClaimOptions = {}
): Promise<DrainMailboxResult> {
  await recoverStaleRunningEvent(state.storage, options);

  let processed = 0;
  while (true) {
    const item = await claimNextMailboxEvent(state.storage, options);
    if (!item) {
      return { processed };
    }

    try {
      const result = await handler(state, env, item);
      await completeMailboxEvent(state.storage, item, result);
      processed += 1;
    } catch (error) {
      await failMailboxEvent(state.storage, item, error);
      throw error;
    }
  }
}

function defaultDrainMailboxHandler(
  state: DurableObjectState,
  env: Env,
  item: RunningMailboxEvent
) {
  return handleAgentEvent(state, env, item.event);
}
