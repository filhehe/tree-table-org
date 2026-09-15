import { aggregateTree } from '@/domain/aggregate';
import { buildTree } from '@/domain/tree';
import type { OrgIndex, OrgNode, OrgSnapshot } from '@/domain/types';

export type { OrgSnapshot };

export function orgNodesEqual(a: OrgNode, b: OrgNode) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.parentId === b.parentId &&
    a.headcount === b.headcount &&
    a.budget === b.budget &&
    a.performance === b.performance &&
    a.updatedAt === b.updatedAt
  );
}

export function sameOrgNodeList(a: OrgNode[], b: OrgNode[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right || !orgNodesEqual(left, right)) return false;
  }
  return true;
}

/** Связи графа: состав узлов и parentId. Метрики в сравнение не входят. */
export function sameOrgTopology(a: OrgNode[], b: OrgNode[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.id !== right.id || left.parentId !== right.parentId) return false;
  }
  return true;
}

export function buildOrgSnapshot(nodes: OrgNode[]): OrgSnapshot {
  const index = buildTree(nodes);
  return {
    nodes,
    index,
    aggregates: aggregateTree(index),
  };
}

function reuseIndex(nodes: OrgNode[], previous: OrgIndex): OrgIndex {
  const nodesById = new Map(previous.nodesById);
  for (const node of nodes) {
    const current = nodesById.get(node.id);
    if (!current || !orgNodesEqual(current, node)) {
      nodesById.set(node.id, node);
    }
  }
  return {
    nodesById,
    childrenByParent: previous.childrenByParent,
    roots: previous.roots,
    levels: previous.levels,
  };
}

/** Полный проход агрегации только если payload изменился. Топология переиспользуется. */
export function memoizeOrgSnapshot(
  nodes: OrgNode[],
  previous: OrgSnapshot | null | undefined,
): OrgSnapshot {
  if (previous && sameOrgNodeList(nodes, previous.nodes)) {
    return previous;
  }
  if (previous && sameOrgTopology(nodes, previous.nodes)) {
    const index = reuseIndex(nodes, previous.index);
    return {
      nodes,
      index,
      aggregates: aggregateTree(index),
    };
  }
  return buildOrgSnapshot(nodes);
}
