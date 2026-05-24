import { getPlatformOutboundAdapter } from "../platforms/outbound/registry";
import type { PlatformActivityType } from "../platforms/outbound/types";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";

const DEFAULT_ACTIVITY_INTERVAL_MS = 4_000;
const DEFAULT_MAX_ACTIVITY_PULSES = 15;

export type ActivityPulseOptions = {
  intervalMs?: number;
  maxPulses?: number;
};

export async function withPlatformActivity<T>(
  env: Env,
  message: InternalMessage,
  task: () => Promise<T>,
  activity: PlatformActivityType = "typing"
): Promise<T> {
  const adapter = getPlatformOutboundAdapter(env, message.platform);
  if (!adapter?.sendActivity) {
    return task();
  }

  return runWithActivityPulse(async () => {
    await adapter.sendActivity?.({
      agentId: message.agentId,
      conversationId: message.conversationId,
      activity
    });
  }, task);
}

export async function runWithActivityPulse<T>(
  sendActivity: () => Promise<void>,
  task: () => Promise<T>,
  options: ActivityPulseOptions = {}
): Promise<T> {
  const intervalMs = options.intervalMs ?? DEFAULT_ACTIVITY_INTERVAL_MS;
  const maxPulses = options.maxPulses ?? DEFAULT_MAX_ACTIVITY_PULSES;
  let stopped = false;
  let pulses = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const scheduleNext = () => {
    timer = setTimeout(() => {
      void pulse();
    }, intervalMs);
  };

  const pulse = async () => {
    if (stopped || pulses >= maxPulses) {
      return;
    }

    pulses += 1;
    await sendActivity().catch(() => undefined);

    if (!stopped && pulses < maxPulses) {
      scheduleNext();
    }
  };

  void pulse();

  try {
    return await task();
  } finally {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
  }
}
