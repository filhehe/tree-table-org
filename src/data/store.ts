import { fetchOrgTreeSnapshot, peekOrgTreeCache, type OrgSnapshot } from '@/data/cache'
import { readOrgTreeSearch } from '@/data/http'
import { orgTreeCacheKey } from '@/data/orgTreeCacheKey'
import { defaultExpandedIds, expandAncestors, pruneExpandedIds } from '@/domain/tree'
import type { Aggregate, OrgNode } from '@/domain/types'

export type OrgTreeStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready'

export type OrgTreeState = {
  status: OrgTreeStatus
  error: Error | null
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  expandedIds: Set<string>
  selectedId: string | null
  nameQuery: string
}

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
  }
}

let state: OrgTreeState = createEmptyState('idle')
const serverSnapshot = createEmptyState('idle')
const listeners = new Set<() => void>()
let subscriberCount = 0
let controller: AbortController | null = null
let expandInitialized = false
let lastCacheKey: string | null = null
let lastSnapshot: OrgSnapshot | null = null

function emit() {
  for (const listener of listeners) listener()
}

function setState(next: OrgTreeState) {
  state = next
  emit()
}

function commitSnapshot(snapshot: OrgSnapshot, cacheKey: string) {
  const sameDataset = expandInitialized && lastCacheKey === cacheKey
  const status = snapshot.index.nodesById.size === 0 ? 'empty' : 'ready'

  if (
    snapshot === lastSnapshot &&
    sameDataset &&
    (state.status === 'ready' || state.status === 'empty')
  ) {
    return
  }

  const expandedIds = sameDataset
    ? pruneExpandedIds(state.expandedIds, snapshot.index)
    : defaultExpandedIds(snapshot.index)

  const selectedId =
    sameDataset && state.selectedId && snapshot.index.nodesById.has(state.selectedId)
      ? state.selectedId
      : null

  expandInitialized = true
  lastCacheKey = cacheKey
  lastSnapshot = snapshot

  setState({
    status,
    error: null,
    nodesById: snapshot.index.nodesById,
    childrenByParent: snapshot.index.childrenByParent,
    aggregates: snapshot.aggregates,
    expandedIds,
    selectedId,
    nameQuery: sameDataset ? state.nameQuery : '',
  })
}

async function hydrate(signal: AbortSignal, options?: { force?: boolean }) {
  const search = readOrgTreeSearch()
  const cacheKey = orgTreeCacheKey(search)

  if (!options?.force) {
    const peek = peekOrgTreeCache(search)
    if (peek?.fresh) {
      commitSnapshot(peek.snapshot, cacheKey)
      return
    }
    if (peek) {
      commitSnapshot(peek.snapshot, cacheKey)
      try {
        const snapshot = await fetchOrgTreeSnapshot(signal, search)
        if (signal.aborted) return
        commitSnapshot(snapshot, cacheKey)
      } catch {
        if (signal.aborted) return
      }
      return
    }
  }

  setState({
    ...state,
    status: 'loading',
    error: null,
  })

  try {
    const snapshot = await fetchOrgTreeSnapshot(signal, search)
    if (signal.aborted) return
    commitSnapshot(snapshot, cacheKey)
  } catch (error) {
    if (signal.aborted) return
    setState({
      ...state,
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    })
  }
}

function startSession() {
  controller?.abort()
  controller = new AbortController()
  void hydrate(controller.signal)
}

export function subscribeOrgTree(listener: () => void) {
  listeners.add(listener)
  subscriberCount += 1
  if (subscriberCount === 1) {
    startSession()
  }
  return () => {
    listeners.delete(listener)
    subscriberCount -= 1
    if (subscriberCount === 0) {
      controller?.abort()
      controller = null
    }
  }
}

export function getOrgTreeSnapshot() {
  return state
}

export function getOrgTreeServerSnapshot(): OrgTreeState {
  return serverSnapshot
}

export function retryOrgTree() {
  expandInitialized = false
  lastCacheKey = null
  lastSnapshot = null
  controller?.abort()
  controller = new AbortController()
  void hydrate(controller.signal, { force: true })
}

export function toggleExpanded(id: string) {
  const next = new Set(state.expandedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  setState({ ...state, expandedIds: next })
}

export function selectNode(id: string) {
  if (!state.nodesById.has(id)) return
  setState({
    ...state,
    selectedId: id,
    expandedIds: expandAncestors(id, state.nodesById, state.expandedIds),
  })
}

export function setNameQuery(nameQuery: string) {
  if (state.nameQuery === nameQuery) return
  setState({ ...state, nameQuery })
}
