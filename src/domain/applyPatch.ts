import type {
  Aggregate,
  OrgIndex,
  OrgNode,
  OrgPatch,
  OrgSnapshot,
  UpdatedField,
} from '@/domain/types';

export type PatchApplyResult = {
  snapshot: OrgSnapshot;
  touchedIds: string[];
  touchedFields: Map<string, Set<UpdatedField>>;
};

function mergeNode(current: OrgNode, patch: OrgPatch): OrgNode {
  return {
    ...current,
    headcount: patch.headcount ?? current.headcount,
    budget: patch.budget ?? current.budget,
    performance: patch.performance ?? current.performance,
    updatedAt: patch.updatedAt,
  };
}

function descendantHeadcount(node: OrgNode | undefined, aggregate: Aggregate | undefined) {
  if (!node || !aggregate) return 0;
  return Math.max(0, aggregate.totalHeadcount - node.headcount);
}

export function diffUpdatedFields(
  previousNode: OrgNode | undefined,
  nextNode: OrgNode | undefined,
  previousAggregate: Aggregate | undefined,
  nextAggregate: Aggregate | undefined,
): Set<UpdatedField> {
  const fields = new Set<UpdatedField>();
  if (previousNode && nextNode) {
    if (previousNode.headcount !== nextNode.headcount) fields.add('ownHeadcount');
    if (previousNode.performance !== nextNode.performance) fields.add('ownPerformance');
  }
  if (previousAggregate && nextAggregate) {
    if (previousAggregate.totalHeadcount !== nextAggregate.totalHeadcount) {
      fields.add('totalHeadcount');
    }
    if (previousAggregate.totalBudget !== nextAggregate.totalBudget) fields.add('totalBudget');
    if (previousAggregate.weightedPerformance !== nextAggregate.weightedPerformance) {
      fields.add('weightedPerformance');
    }
  }
  if (
    descendantHeadcount(previousNode, previousAggregate) !==
    descendantHeadcount(nextNode, nextAggregate)
  ) {
    fields.add('descendantHeadcount');
  }
  return fields;
}

function recomputeAggregate(
  id: string,
  index: OrgIndex,
  aggregates: Map<string, Aggregate>,
): Aggregate {
  const node = index.nodesById.get(id);
  if (!node) {
    return {
      level: 0,
      totalHeadcount: 0,
      totalBudget: 0,
      weightedSum: 0,
      weightedPerformance: 0,
    };
  }

  let totalHeadcount = node.headcount;
  let totalBudget = node.budget;
  let weightedSum = node.performance * node.headcount;

  for (const childId of index.childrenByParent.get(id) ?? []) {
    const child = aggregates.get(childId);
    if (!child) continue;
    totalHeadcount += child.totalHeadcount;
    totalBudget += child.totalBudget;
    weightedSum += child.weightedSum;
  }

  return {
    level: index.levels.get(id) ?? 0,
    totalHeadcount,
    totalBudget,
    weightedSum,
    weightedPerformance: totalHeadcount === 0 ? 0 : weightedSum / totalHeadcount,
  };
}

export function applyPatch(
  index: OrgIndex,
  aggregates: Map<string, Aggregate>,
  patch: OrgPatch,
): {
  index: OrgIndex;
  aggregates: Map<string, Aggregate>;
  touchedIds: string[];
  touchedFields: Map<string, Set<UpdatedField>>;
} | null {
  const current = index.nodesById.get(patch.id);
  if (!current) return null;

  const nextNode = mergeNode(current, patch);
  const nodesById = new Map(index.nodesById);
  nodesById.set(patch.id, nextNode);
  const nextIndex: OrgIndex = {
    nodesById,
    childrenByParent: index.childrenByParent,
    roots: index.roots,
    levels: index.levels,
  };

  const nextAggregates = new Map(aggregates);
  const touchedIds: string[] = [];
  const touchedFields = new Map<string, Set<UpdatedField>>();
  let id: string | null = patch.id;

  while (id) {
    const previousNode = index.nodesById.get(id);
    const previousAggregate = aggregates.get(id);
    const next = recomputeAggregate(id, nextIndex, nextAggregates);
    nextAggregates.set(id, next);
    const fields = diffUpdatedFields(
      previousNode,
      nextIndex.nodesById.get(id),
      previousAggregate,
      next,
    );
    if (fields.size > 0) {
      touchedIds.push(id);
      touchedFields.set(id, fields);
    }
    id = nextIndex.nodesById.get(id)?.parentId ?? null;
  }

  return { index: nextIndex, aggregates: nextAggregates, touchedIds, touchedFields };
}

export function applyPatchToSnapshot(
  snapshot: OrgSnapshot,
  patch: OrgPatch,
): PatchApplyResult | null {
  const applied = applyPatch(snapshot.index, snapshot.aggregates, patch);
  if (!applied) return null;

  const nextNode = applied.index.nodesById.get(patch.id);
  const nodes = nextNode
    ? snapshot.nodes.map((node) => (node.id === patch.id ? nextNode : node))
    : snapshot.nodes;

  return {
    snapshot: {
      nodes,
      index: applied.index,
      aggregates: applied.aggregates,
    },
    touchedIds: applied.touchedIds,
    touchedFields: applied.touchedFields,
  };
}
