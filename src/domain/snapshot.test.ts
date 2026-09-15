import { describe, expect, it, vi } from 'vitest';
import * as aggregate from '@/domain/aggregate';
import { orgNode } from '@/domain/orgNode.fixture';
import { buildOrgSnapshot, memoizeOrgSnapshot } from '@/domain/snapshot';

const nodes = [
  orgNode('root', 'Root', { headcount: 2, budget: 10, performance: 50 }),
  orgNode('leaf', 'Leaf', {
    parentId: 'root',
    headcount: 3,
    budget: 20,
    performance: 100,
  }),
];

describe('memoizeOrgSnapshot', () => {
  it('считает агрегацию один раз, пока узлы те же', () => {
    const spy = vi.spyOn(aggregate, 'aggregateTree');
    const first = memoizeOrgSnapshot(nodes, null);
    const second = memoizeOrgSnapshot(
      nodes.map((node) => ({ ...node })),
      first,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(second.aggregates).toBe(first.aggregates);
    expect(second.aggregates.get('root')?.totalHeadcount).toBe(5);
    spy.mockRestore();
  });

  it('пересчитывает, если изменились данные узла', () => {
    const previous = buildOrgSnapshot(nodes);
    const next = memoizeOrgSnapshot([nodes[0]!, { ...nodes[1]!, headcount: 8 }], previous);

    expect(next).not.toBe(previous);
    expect(next.aggregates).not.toBe(previous.aggregates);
    expect(next.aggregates.get('root')?.totalHeadcount).toBe(10);
  });

  it('при той же топологии переиспользует childrenByParent', () => {
    const previous = buildOrgSnapshot(nodes);
    const next = memoizeOrgSnapshot([nodes[0]!, { ...nodes[1]!, headcount: 8 }], previous);

    expect(next.index.childrenByParent).toBe(previous.index.childrenByParent);
    expect(next.index.roots).toBe(previous.index.roots);
    expect(next.index.nodesById).not.toBe(previous.index.nodesById);
    expect(next.index.nodesById.get('root')).toBe(previous.index.nodesById.get('root'));
    expect(next.index.nodesById.get('leaf')).not.toBe(previous.index.nodesById.get('leaf'));
  });
});
