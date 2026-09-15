import { fetchOrgTreeSnapshot, peekOrgTreeCache, type OrgSnapshot } from '@/data/cache'
import { readOrgTreeSearch } from '@/data/http'
import { orgTreeCacheKey } from '@/data/orgTreeCacheKey'
import { defaultExpandedIds, pruneExpandedIds } from '@/domain/tree'
import type { Aggregate, OrgNode } from '@/domain/types'

export type OrgTreeStatus = 'idle' | 'loading' | 'error' | 'empty' | 'ready'

export type OrgTreeState = {
  status: OrgTreeStatus
  error: Error | null
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  expandedIds: Set<string>
}

function createEmptyState(status: OrgTreeStatus): OrgTreeState {
  return {
    status,
    error: null,
    nodesById: new Map(),
    childrenByParent: new Map(),
    aggregates: new Map(),
    expandedIds: new Set(),
  }
}

let state: OrgTreeState = createEmptyState('idle')
const serverSnapshot = createEmptyState('idle')
const listeners = new Set<() => void>()
let subscriberCount = 0
let controller: AbortController | null = null
let expandInitialized = false
let lastCacheKey: string | null = null

function emit() {
  for (const listener of listeners) listener()
}

function setState(next: OrgTreeState) {
  state = next
  emit()
}

function commitSnapshot(snapshot: OrgSnapshot, cacheKey: string) {
  const sameDataset = expandInitialized && lastCacheKey === cacheKey
  const expandedIds = sameDataset
    ? pruneExpandedIds(state.expandedIds, snapshot.index)
    : defaultExpandedIds(snapshot.index)

  expandInitialized = true
  lastCacheKey = cacheKey

  setState({
    status: snapshot.index.nodesById.size === 0 ? 'empty' : 'ready',
    error: null,
    nodesById: snapshot.index.nodesById,
    childrenByParent: snapshot.index.childrenByParent,
    aggregates: snapshot.aggregates,
    expandedIds,
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
