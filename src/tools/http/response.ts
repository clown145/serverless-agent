const DEFAULT_MAX_BYTES = 1_000_000;

export async function readResponseText(
  response: Response,
  maxBytes = DEFAULT_MAX_BYTES
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    const text = await response.text();
    return { text: text.slice(0, maxBytes), truncated: text.length > maxBytes };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }

    if (total + value.length > maxBytes) {
      chunks.push(value.slice(0, maxBytes - total));
      truncated = true;
      break;
    }

    chunks.push(value);
    total += value.length;
  }

  if (truncated) {
    await reader.cancel().catch(() => undefined);
  }

  return { text: new TextDecoder().decode(concat(chunks)), truncated };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}
