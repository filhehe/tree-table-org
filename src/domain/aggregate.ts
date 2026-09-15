import type { Aggregate, OrgIndex } from '@/domain/types';

export function aggregateTree(index: OrgIndex): Map<string, Aggregate> {
  const aggregates = new Map<string, Aggregate>();

  const visit = (id: string): Aggregate => {
    const node = index.nodesById.get(id);
    if (!node) {
      const empty: Aggregate = {
        level: 0,
        totalHeadcount: 0,
        totalBudget: 0,
        weightedSum: 0,
        weightedPerformance: 0,
      };
      return empty;
    }

    let totalHeadcount = node.headcount;
    let totalBudget = node.budget;
    let weightedSum = node.performance * node.headcount;

    for (const childId of index.childrenByParent.get(id) ?? []) {
      const child = visit(childId);
      totalHeadcount += child.totalHeadcount;
      totalBudget += child.totalBudget;
      weightedSum += child.weightedSum;
    }

    const aggregate: Aggregate = {
      level: index.levels.get(id) ?? 0,
      totalHeadcount,
      totalBudget,
      weightedSum,
      weightedPerformance: totalHeadcount === 0 ? 0 : weightedSum / totalHeadcount,
    };
    aggregates.set(id, aggregate);
    return aggregate;
  };

  for (const rootId of index.roots) visit(rootId);
  return aggregates;
}
