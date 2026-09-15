import { applyPatchToSnapshot } from '@/domain/applyPatch';
import { parseOrgTree } from '@/domain/schema';
import { memoizeOrgSnapshot, type OrgSnapshot } from '@/domain/snapshot';
import type { OrgPatch } from '@/domain/types';
import { fetchOrgTree } from '@/data/http';
import { orgTreeCacheKey } from '@/data/orgTreeCacheKey';

export const STALE_TIME_MS = 5_000;

export type { OrgSnapshot };

type CacheEntry = {
  snapshot: OrgSnapshot;
  fetchedAt: number;
};

type Inflight = {
  promise: Promise<OrgSnapshot>;
  signal: AbortSignal;
};

const entries = new Map<string, CacheEntry>();
const inflights = new Map<string, Inflight>();
const lastMutationAt = new Map<string, number>();

export function peekOrgTreeCache(search: string, now = Date.now()) {
  const key = orgTreeCacheKey(search);
  const entry = entries.get(key);
  if (!entry) return null;
  return {
    key,
    snapshot: entry.snapshot,
    fetchedAt: entry.fetchedAt,
    fresh: now - entry.fetchedAt < STALE_TIME_MS,
  };
}

export async function fetchOrgTreeSnapshot(
  signal: AbortSignal,
  search: string,
): Promise<OrgSnapshot> {
  const key = orgTreeCacheKey(search);
  const inflight = inflights.get(key);
  if (inflight && !inflight.signal.aborted) {
    return inflight.promise;
  }

  const startedAt = Date.now();
  const request = (async () => {
    const raw = await fetchOrgTree(signal, search);
    const nodes = parseOrgTree(raw);
    const mutationAt = lastMutationAt.get(key) ?? 0;
    const current = entries.get(key);
    if (startedAt <= mutationAt && current) {
      return current.snapshot;
    }

    const snapshot = memoizeOrgSnapshot(nodes, current?.snapshot);
    entries.set(key, { snapshot, fetchedAt: Date.now() });
    lastMutationAt.set(key, Math.max(mutationAt, startedAt));
    return snapshot;
  })();

  inflights.set(key, { promise: request, signal });

  try {
    return await request;
  } finally {
    if (inflights.get(key)?.promise === request) inflights.delete(key);
  }
}

export function clearOrgTreeCache() {
  entries.clear();
  inflights.clear();
  lastMutationAt.clear();
}

export function writeOrgTreeCache(search: string, snapshot: OrgSnapshot, now = Date.now()) {
  const key = orgTreeCacheKey(search);
  entries.set(key, { snapshot, fetchedAt: now });
  lastMutationAt.set(key, now);
}

export function patchOrgTreeCache(search: string, patch: OrgPatch, now = Date.now()) {
  const key = orgTreeCacheKey(search);
  const entry = entries.get(key);
  if (!entry) return null;

  const applied = applyPatchToSnapshot(entry.snapshot, patch);
  if (!applied) return null;

  entries.set(key, { snapshot: applied.snapshot, fetchedAt: entry.fetchedAt });
  lastMutationAt.set(key, now);
  return applied;
}
