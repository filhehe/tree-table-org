import { parseOrgPatch } from '@/domain/schema';
import type { OrgPatch } from '@/domain/types';
import {
  anyAbortSignal,
  isBrowserOnline,
  subscribeBrowserOnline,
  waitUntilOnline,
} from '@/data/online';
import { backoffMs, createSseParser, parseJsonPatch } from '@/data/sseParse';

export type ConnectionStatus = 'live' | 'reconnecting' | 'offline';

const OFFLINE_FAILURES = 5;
const RECOVER_AFTER_MS = 5_000;
export const SSE_STALL_MS = 20_000;

export type OrgTreeStreamHandlers = {
  onStatus: (status: ConnectionStatus) => void;
  onPatch: (patch: OrgPatch) => void;
  onNeedSnapshot: () => Promise<void>;
};

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function readPatches(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onPatch: (patch: OrgPatch) => void,
  onActivity: () => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser((event, data) => {
    if (event !== 'patch') return;
    if (!isBrowserOnline()) return;
    const patch = parseJsonPatch(data, parseOrgPatch);
    if (!patch) {
      console.warn('Пропущен невалидный SSE-патч');
      return;
    }
    onPatch(patch);
  });

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!isBrowserOnline()) break;
      onActivity();
      parser.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}

export async function listenOrgTreeStream(signal: AbortSignal, handlers: OrgTreeStreamHandlers) {
  let failures = 0;
  let closedAt = 0;

  while (!signal.aborted) {
    if (!isBrowserOnline()) {
      handlers.onStatus('offline');
      await waitUntilOnline(signal);
      if (signal.aborted) return;
      failures = Math.max(failures, 1);
      if (closedAt === 0) closedAt = Date.now();
    }

    if (failures > 0) {
      const gap = closedAt === 0 ? 0 : Date.now() - closedAt;
      handlers.onStatus(
        failures >= OFFLINE_FAILURES || !isBrowserOnline() ? 'offline' : 'reconnecting',
      );
      if (isBrowserOnline() && (gap >= RECOVER_AFTER_MS || failures >= OFFLINE_FAILURES)) {
        try {
          await handlers.onNeedSnapshot();
        } catch {
          // snapshot recovery is best-effort; the next open still applies patches
        }
      }
      const delayAbort = new AbortController();
      const stopDelay = subscribeBrowserOnline((online) => {
        if (!online) delayAbort.abort();
      });
      await sleep(backoffMs(failures), anyAbortSignal(signal, delayAbort.signal));
      stopDelay();
      if (signal.aborted) return;
      if (!isBrowserOnline()) continue;
    } else if (isBrowserOnline()) {
      handlers.onStatus('reconnecting');
    }

    const cycle = new AbortController();
    const combined = anyAbortSignal(signal, cycle.signal);
    const stopOffline = subscribeBrowserOnline((online) => {
      if (!online) cycle.abort();
    });

    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const armStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => cycle.abort(), SSE_STALL_MS);
    };

    try {
      const response = await fetch('/api/org-tree/stream', {
        method: 'GET',
        signal: combined,
        headers: { Accept: 'text/event-stream' },
      });
      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP ${response.status}`);
      }
      if (!isBrowserOnline()) {
        failures = Math.max(failures, 1);
        handlers.onStatus('offline');
        continue;
      }

      armStall();
      await readPatches(response.body, combined, handlers.onPatch, () => {
        if (!isBrowserOnline()) {
          cycle.abort();
          return;
        }
        failures = 0;
        handlers.onStatus('live');
        armStall();
      });
      if (signal.aborted) return;
      closedAt = Date.now();
      failures = Math.max(failures, 1);
    } catch (error) {
      if (signal.aborted) return;
      closedAt = Date.now();
      if (isBrowserOnline()) {
        failures += 1;
        handlers.onStatus(failures >= OFFLINE_FAILURES ? 'offline' : 'reconnecting');
        console.warn('SSE org-tree stream', error);
      } else {
        failures = Math.max(failures, 1);
        handlers.onStatus('offline');
      }
    } finally {
      cycle.abort();
      if (stallTimer) clearTimeout(stallTimer);
      stopOffline();
    }
  }
}
