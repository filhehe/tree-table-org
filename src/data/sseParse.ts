import type { OrgPatch } from '@/domain/types';

export type SseEventHandler = (event: string, data: string) => void;

export function createSseParser(onEvent: SseEventHandler) {
  let buffer = '';

  const flush = (block: string) => {
    if (!block.trim()) return;

    let event = 'message';
    const dataLines: string[] = [];

    for (const rawLine of block.split(/\r?\n/)) {
      if (!rawLine || rawLine.startsWith(':')) continue;
      const separator = rawLine.indexOf(':');
      const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
      let value = separator === -1 ? '' : rawLine.slice(separator + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      if (field === 'data') dataLines.push(value);
    }

    if (dataLines.length === 0) return;
    onEvent(event, dataLines.join('\n'));
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        flush(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    },
  };
}

export function backoffMs(failures: number, cap = 30_000) {
  const attempt = Math.max(1, failures);
  return Math.min(cap, 1000 * 2 ** (attempt - 1));
}

export function parseJsonPatch(data: string, parse: (input: unknown) => OrgPatch | null) {
  try {
    return parse(JSON.parse(data) as unknown);
  } catch {
    return null;
  }
}
