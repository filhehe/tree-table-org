import { OrgGraphError, type OrgIndex, type OrgNode } from '@/domain/types';

export function buildTree(nodes: OrgNode[]): OrgIndex {
  const nodesById = new Map<string, OrgNode>();

  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      throw new OrgGraphError(`Дублирующийся id: ${node.id}`);
    }
    nodesById.set(node.id, node);
  }

  const childrenByParent = new Map<string | null, string[]>();

  for (const node of nodes) {
    if (node.parentId !== null && !nodesById.has(node.parentId)) {
      throw new OrgGraphError(`Несуществующий parentId: ${node.parentId} (узел ${node.id})`);
    }

    const siblings = childrenByParent.get(node.parentId);
    if (siblings) {
      siblings.push(node.id);
    } else {
      childrenByParent.set(node.parentId, [node.id]);
    }
  }

  for (const node of nodes) {
    const seen = new Set<string>();
    let current: OrgNode | undefined = node;
    while (current) {
      if (seen.has(current.id)) {
        throw new OrgGraphError(`Цикл в parentId, узел ${node.id}`);
      }
      seen.add(current.id);
      current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }
  }

  const roots = childrenByParent.get(null) ?? [];
  const levels = new Map<string, number>();

  const assignLevels = (id: string, level: number) => {
    levels.set(id, level);
    const children = childrenByParent.get(id);
    if (!children) return;
    for (const childId of children) {
      assignLevels(childId, level + 1);
    }
  };

  for (const rootId of roots) {
    assignLevels(rootId, 0);
  }

  return { nodesById, childrenByParent, roots, levels };
}

export function defaultExpandedIds(index: OrgIndex): Set<string> {
  const expanded = new Set<string>();

  for (const [id, level] of index.levels) {
    if (level > 1) continue;

    const children = index.childrenByParent.get(id);
    if (children && children.length > 0) {
      expanded.add(id);
    }
  }
  return expanded;
}

export function expandAncestors(
  id: string,
  nodesById: Map<string, OrgNode>,
  expandedIds: Set<string>,
): Set<string> {
  const next = new Set(expandedIds);
  let current = nodesById.get(id)?.parentId ?? null;

  while (current) {
    next.add(current);
    current = nodesById.get(current)?.parentId ?? null;
  }

  return next;
}

export function pruneExpandedIds(expandedIds: Set<string>, index: OrgIndex): Set<string> {
  const next = new Set<string>();
  for (const id of expandedIds) {
    if (index.nodesById.has(id)) next.add(id);
  }
  return next;
}
