import { useSyncExternalStore } from 'react'
import {
  getOrgTreeServerSnapshot,
  getOrgTreeSnapshot,
  retryOrgTree,
  subscribeOrgTree,
  toggleExpanded,
} from '@/data/store'

export function useOrgTree() {
  const state = useSyncExternalStore(
    subscribeOrgTree,
    getOrgTreeSnapshot,
    getOrgTreeServerSnapshot,
  )

  return {
    ...state,
    retry: retryOrgTree,
    toggleExpanded,
  }
}
