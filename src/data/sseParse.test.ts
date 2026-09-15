import { describe, expect, it } from 'vitest';
import { backoffMs, createSseParser } from '@/data/sseParse';

describe('createSseParser', () => {
  it('собирает event patch из чанков и игнорирует heartbeat', () => {
    const events: { event: string; data: string }[] = [];
    const parser = createSseParser((event, data) => events.push({ event, data }));

    parser.push(': heartbeat\n\n');
    parser.push('id: 1\nevent: pa');
    parser.push('tch\ndata: {"id":"web"}\n\n');

    expect(events).toEqual([{ event: 'patch', data: '{"id":"web"}' }]);
  });
});

describe('backoffMs', () => {
  it('растёт 1s → 2s → 4s и не выше 30s', () => {
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(3)).toBe(4000);
    expect(backoffMs(10)).toBe(30_000);
  });
});
