import { useCallback, useRef, useSyncExternalStore } from 'react';
import {
  getOrgTreeServerSnapshot,
  getOrgTreeSnapshot,
  subscribeOrgTree,
  type OrgTreeState,
} from '@/data/store';
import type { UpdatedField } from '@/domain/types';

const EMPTY_IDS: string[] = [];

export function useOrgTreeSelector<T>(select: (state: OrgTreeState) => T): T {
  const selectRef = useRef(select);
  selectRef.current = select;
  const seen = useRef<{ state: OrgTreeState; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = getOrgTreeSnapshot();
    const cached = seen.current;
    if (cached && cached.state === state) return cached.value;

    const value = selectRef.current(state);
    if (cached && Object.is(cached.value, value)) {
      seen.current = { state, value: cached.value };
      return cached.value;
    }

    seen.current = { state, value };
    return value;
  }, []);

  const getServerSnapshot = useCallback(() => selectRef.current(getOrgTreeServerSnapshot()), []);

  return useSyncExternalStore(subscribeOrgTree, getSnapshot, getServerSnapshot);
}

export function useOrgStatus() {
  return useOrgTreeSelector((state) => state.status);
}

export function useOrgError() {
  return useOrgTreeSelector((state) => state.error);
}

export function useOrgNameQuery() {
  return useOrgTreeSelector((state) => state.nameQuery);
}

export function useOrgSelectedId() {
  return useOrgTreeSelector((state) => state.selectedId);
}

export function useOrgRoots() {
  return useOrgTreeSelector((state) => state.childrenByParent.get(null) ?? EMPTY_IDS);
}

export function useOrgNode(id: string) {
  return useOrgTreeSelector((state) => state.nodesById.get(id));
}

export function useOrgAggregate(id: string) {
  return useOrgTreeSelector((state) => state.aggregates.get(id));
}

export function useOrgChildren(id: string) {
  return useOrgTreeSelector((state) => state.childrenByParent.get(id) ?? EMPTY_IDS);
}

export function useOrgExpanded(id: string) {
  return useOrgTreeSelector((state) => state.expandedIds.has(id));
}

export function useOrgSelected(id: string) {
  return useOrgTreeSelector((state) => state.selectedId === id);
}

export function useOrgConnectionStatus() {
  return useOrgTreeSelector((state) => state.connectionStatus);
}

export function useOrgUpdatedTick(id: string, field: UpdatedField) {
  return useOrgTreeSelector((state) => state.updatedFields.get(id)?.get(field) ?? 0);
}
