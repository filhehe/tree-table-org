import { aggregateTree } from '@/domain/aggregate'
import { buildTree } from '@/domain/tree'
import type { Aggregate, OrgIndex, OrgNode } from '@/domain/types'

export type OrgSnapshot = {
  nodes: OrgNode[]
  index: OrgIndex
  aggregates: Map<string, Aggregate>
}

export function orgNodesEqual(a: OrgNode, b: OrgNode) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.parentId === b.parentId &&
    a.headcount === b.headcount &&
    a.budget === b.budget &&
    a.performance === b.performance &&
    a.updatedAt === b.updatedAt
  )
}

export function sameOrgNodeList(a: OrgNode[], b: OrgNode[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i]
    const right = b[i]
    if (!left || !right || !orgNodesEqual(left, right)) return false
  }
  return true
}

export function buildOrgSnapshot(nodes: OrgNode[]): OrgSnapshot {
  const index = buildTree(nodes)
  return {
    nodes,
    index,
    aggregates: aggregateTree(index),
  }
}

/** Полный проход агрегации только если payload изменился. Иначе тот же Map. */
export function memoizeOrgSnapshot(
  nodes: OrgNode[],
  previous: OrgSnapshot | null | undefined,
): OrgSnapshot {
  if (previous && sameOrgNodeList(nodes, previous.nodes)) {
    return previous
  }
  return buildOrgSnapshot(nodes)
}
