import { afterEach, describe, expect, it, vi } from 'vitest';
import { isBrowserOnline, waitUntilOnline } from '@/data/online';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isBrowserOnline', () => {
  it('false, если navigator.onLine = false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isBrowserOnline()).toBe(false);
  });

  it('true, если navigator.onLine = true', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isBrowserOnline()).toBe(true);
  });
});

describe('waitUntilOnline', () => {
  it('резолвится сразу, если сеть уже есть', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    await waitUntilOnline(new AbortController().signal);
  });

  it('ждёт событие online', async () => {
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    });

    let settled = false;
    const wait = waitUntilOnline(new AbortController().signal).then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    vi.stubGlobal('navigator', { onLine: true });
    listeners.get('online')?.(new Event('online'));
    await wait;
    expect(settled).toBe(true);
  });
});
