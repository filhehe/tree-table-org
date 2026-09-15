import { describe, expect, it } from 'vitest';
import { aggregateTree } from '@/domain/aggregate';
import { parseOrgTree } from '@/domain/schema';
import { buildTree } from '@/domain/tree';
import { generateOrgTree, getOrgTreeStats } from '../../server/generate.ts';

describe('фикстура org-tree — инварианты', () => {
  const raw = generateOrgTree();
  const nodes = parseOrgTree(raw);
  const index = buildTree(nodes);
  const aggregates = aggregateTree(index);
  const stats = getOrgTreeStats(raw);

  it('не меньше 40 узлов и не меньше трёх уровней', () => {
    expect(stats.count).toBeGreaterThanOrEqual(40);
    expect(stats.levels).toBeGreaterThanOrEqual(3);
    expect(stats.uniqueIds).toBe(stats.count);
  });

  it('проходит zod и buildTree без ошибки', () => {
    expect(nodes).toHaveLength(raw.length);
    expect(index.nodesById.size).toBe(raw.length);
  });

  it('есть агрегаты на каждый узел, сумма корней покрывает всех сотрудников', () => {
    expect(aggregates.size).toBe(index.nodesById.size);
    let ownSum = 0;
    for (const node of index.nodesById.values()) ownSum += node.headcount;
    const rootTotals = index.roots.reduce(
      (sum, id) => sum + (aggregates.get(id)?.totalHeadcount ?? 0),
      0,
    );
    expect(rootTotals).toBe(ownSum);
  });

  it('у каждого узла всего = свои + сумма агрегатов прямых детей', () => {
    for (const [id, node] of index.nodesById) {
      const agg = aggregates.get(id);
      expect(agg).toBeDefined();
      const childSum = (index.childrenByParent.get(id) ?? []).reduce(
        (sum, childId) => sum + (aggregates.get(childId)?.totalHeadcount ?? 0),
        0,
      );
      expect(agg?.totalHeadcount).toBe(node.headcount + childSum);
    }
  });
});
