import {
  fetchOrgTreeSnapshot,
  patchOrgTreeCache,
  peekOrgTreeCache,
  writeOrgTreeCache,
  type OrgSnapshot,
} from '@/data/cache';
import { readOrgTreeSearch } from '@/data/http';
import { orgTreeCacheKey } from '@/data/orgTreeCacheKey';
import { isBrowserOnline } from '@/data/online';
import { listenOrgTreeStream, type ConnectionStatus } from '@/data/sse';
import { applyPatchToSnapshot } from '@/domain/applyPatch';
import { defaultExpandedIds, expandAncestors, pruneExpandedIds } from '@/domain/tree';
import type { Aggregate, OrgNode, OrgPatch, UpdatedField } from '@/domain/types';

export type { ConnectionStatus };

export type OrgTreeStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

export const UPDATE_FADE_MS = 1_500;

export type OrgTreeState = {
  status: OrgTreeStatus;
  error: Error | null;
  nodesById: Map<string, OrgNode>;
  childrenByParent: Map<string | null, string[]>;
  aggregates: Map<string, Aggregate>;
  expandedIds: Set<string>;
  selectedId: string | null;
  nameQuery: string;
  connectionStatus: ConnectionStatus;
  updatedFields: Map<string, Map<UpdatedField, number>>;
};

function createEmptyState(status: OrgTreeStatus): OrgTreeState {
  return {
    status,
    error: null,
    nodesById: new Map(),
    childrenByParent: new Map(),
    aggregates: new Map(),
    expandedIds: new Set(),
    selectedId: null,
    nameQuery: '',
    connectionStatus: 'offline',
    updatedFields: new Map(),
  };
}

let state: OrgTreeState = createEmptyState('idle');
const serverSnapshot = createEmptyState('idle');
const listeners = new Set<() => void>();
let subscriberCount = 0;
let controller: AbortController | null = null;
let sseController: AbortController | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let expandInitialized = false;
let lastCacheKey: string | null = null;
let lastSnapshot: OrgSnapshot | null = null;
const pendingTreeMotion = new Set<string>();

export function requestTreeMotion(id: string) {
  pendingTreeMotion.add(id);
}

export function consumeTreeMotion(id: string) {
  if (!pendingTreeMotion.has(id)) return false;
  pendingTreeMotion.delete(id);
  return true;
}

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: OrgTreeState) {
  state = next;
  emit();
}

function markTouched(fieldsById: Map<string, Set<UpdatedField>>) {
  const now = Date.now();
  const next = new Map(state.updatedFields);
  for (const [id, fields] of fieldsById) {
    const current = new Map(next.get(id) ?? []);
    for (const field of fields) current.set(field, now);
    next.set(id, current);
  }
  scheduleFadeClear(now);
  return next;
}

function scheduleFadeClear(from: number) {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(
    () => {
      fadeTimer = null;
      const now = Date.now();
      const next = new Map<string, Map<UpdatedField, number>>();
      let latest = 0;
      for (const [id, fields] of state.updatedFields) {
        const kept = new Map<UpdatedField, number>();
        for (const [field, at] of fields) {
          if (now - at < UPDATE_FADE_MS) {
            kept.set(field, at);
            if (at > latest) latest = at;
          }
        }
        if (kept.size > 0) next.set(id, kept);
      }
      if (next.size > 0 || state.updatedFields.size > 0) {
        const sameSize = next.size === state.updatedFields.size;
        let same = sameSize;
        if (same) {
          for (const [id, fields] of state.updatedFields) {
            if (fields.size !== (next.get(id)?.size ?? -1)) {
              same = false;
              break;
            }
          }
        }
        if (!same) setState({ ...state, updatedFields: next });
      }
      if (next.size > 0) scheduleFadeClear(latest);
    },
    Math.max(0, from + UPDATE_FADE_MS - Date.now()),
  );
}

function setConnectionStatus(connectionStatus: ConnectionStatus) {
  if (state.connectionStatus === connectionStatus) return;
  setState({ ...state, connectionStatus });
}

function applyIncomingPatch(patch: OrgPatch) {
  if (state.status !== 'ready') return;
  if (state.connectionStatus !== 'live' || !isBrowserOnline()) return;

  const search = readOrgTreeSearch();
  const fromCache = patchOrgTreeCache(search, patch);
  const applied = fromCache ?? (lastSnapshot ? applyPatchToSnapshot(lastSnapshot, patch) : null);
  if (!applied) {
    console.warn(`Пропущен патч неизвестного узла: ${patch.id}`);
    return;
  }

  if (!fromCache) writeOrgTreeCache(search, applied.snapshot);
  lastSnapshot = applied.snapshot;

  setState({
    ...state,
    nodesById: applied.snapshot.index.nodesById,
    childrenByParent: applied.snapshot.index.childrenByParent,
    aggregates: applied.snapshot.aggregates,
    updatedFields: markTouched(applied.touchedFields),
  });
}

async function recoverSnapshot() {
  const signal = sseController?.signal;
  if (!signal || signal.aborted) return;
  const search = readOrgTreeSearch();
  const snapshot = await fetchOrgTreeSnapshot(signal, search);
  if (signal.aborted) return;
  commitSnapshot(snapshot, orgTreeCacheKey(search));
}

function startSse() {
  if (sseController && !sseController.signal.aborted) return;
  sseController = new AbortController();
  void listenOrgTreeStream(sseController.signal, {
    onStatus: setConnectionStatus,
    onPatch: applyIncomingPatch,
    onNeedSnapshot: recoverSnapshot,
  });
}

function stopSse() {
  sseController?.abort();
  sseController = null;
  if (state.connectionStatus !== 'offline') {
    setState({ ...state, connectionStatus: 'offline' });
  }
}

function commitSnapshot(snapshot: OrgSnapshot, cacheKey: string) {
  const sameDataset = expandInitialized && lastCacheKey === cacheKey;
  const status = snapshot.index.nodesById.size === 0 ? 'empty' : 'ready';

  if (
    snapshot === lastSnapshot &&
    sameDataset &&
    (state.status === 'ready' || state.status === 'empty')
  ) {
    if (status === 'ready') startSse();
    return;
  }

  const expandedIds = sameDataset
    ? pruneExpandedIds(state.expandedIds, snapshot.index)
    : defaultExpandedIds(snapshot.index);

  const selectedId =
    sameDataset && state.selectedId && snapshot.index.nodesById.has(state.selectedId)
      ? state.selectedId
      : null;

  expandInitialized = true;
  lastCacheKey = cacheKey;
  lastSnapshot = snapshot;

  setState({
    status,
    error: null,
    nodesById: snapshot.index.nodesById,
    childrenByParent: snapshot.index.childrenByParent,
    aggregates: snapshot.aggregates,
    expandedIds,
    selectedId,
    nameQuery: sameDataset ? state.nameQuery : '',
    connectionStatus: status === 'ready' ? state.connectionStatus : 'offline',
    updatedFields: sameDataset ? state.updatedFields : new Map(),
  });

  if (status === 'ready') startSse();
  else stopSse();
}

async function hydrate(signal: AbortSignal, options?: { force?: boolean }) {
  const search = readOrgTreeSearch();
  const cacheKey = orgTreeCacheKey(search);

  if (!options?.force) {
    const peek = peekOrgTreeCache(search);
    if (peek?.fresh) {
      commitSnapshot(peek.snapshot, cacheKey);
      return;
    }
    if (peek) {
      commitSnapshot(peek.snapshot, cacheKey);
      try {
        const snapshot = await fetchOrgTreeSnapshot(signal, search);
        if (signal.aborted) return;
        commitSnapshot(snapshot, cacheKey);
      } catch {
        if (signal.aborted) return;
      }
      return;
    }
  }

  setState({
    ...state,
    status: 'loading',
    error: null,
  });

  try {
    const snapshot = await fetchOrgTreeSnapshot(signal, search);
    if (signal.aborted) return;
    commitSnapshot(snapshot, cacheKey);
  } catch (error) {
    if (signal.aborted) return;
    stopSse();
    setState({
      ...state,
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
      connectionStatus: 'offline',
    });
  }
}

function startSession() {
  controller?.abort();
  controller = new AbortController();
  void hydrate(controller.signal);
}

export function subscribeOrgTree(listener: () => void) {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    startSession();
  }
  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      controller?.abort();
      controller = null;
      stopSse();
    }
  };
}

export function getOrgTreeSnapshot() {
  return state;
}

export function getOrgTreeServerSnapshot(): OrgTreeState {
  return serverSnapshot;
}

export function retryOrgTree() {
  expandInitialized = false;
  lastCacheKey = null;
  lastSnapshot = null;
  stopSse();
  controller?.abort();
  controller = new AbortController();
  void hydrate(controller.signal, { force: true });
}

export function toggleExpanded(id: string) {
  requestTreeMotion(id);
  const next = new Set(state.expandedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setState({ ...state, expandedIds: next });
}

export function selectNode(id: string) {
  if (!state.nodesById.has(id)) return;
  setState({
    ...state,
    selectedId: id,
    expandedIds: expandAncestors(id, state.nodesById, state.expandedIds),
  });
}

export function clearSelection() {
  if (state.selectedId === null) return;
  setState({ ...state, selectedId: null });
}

export function setNameQuery(nameQuery: string) {
  if (state.nameQuery === nameQuery) return;
  setState({ ...state, nameQuery });
}
