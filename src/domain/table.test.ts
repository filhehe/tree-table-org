import { describe, expect, it } from 'vitest';
import { aggregateTree } from '@/domain/aggregate';
import { orgNode } from '@/domain/orgNode.fixture';
import { filterRowsByName, nextHeaderSort, projectTableRows, sortRows } from '@/domain/table';
import { buildTree } from '@/domain/tree';

function rowsOf(...nodes: Parameters<typeof buildTree>[0]) {
  const index = buildTree(nodes);
  return projectTableRows(index, aggregateTree(index));
}

describe('projectTableRows', () => {
  it('берёт агрегаты узла+потомков, порядок — обход дерева', () => {
    const rows = rowsOf(
      orgNode('A', 'A', { headcount: 10, budget: 100, performance: 50 }),
      orgNode('B', 'B', {
        parentId: 'A',
        headcount: 6,
        budget: 40,
        performance: 100,
      }),
    );

    expect(rows.map((row) => row.id)).toEqual(['A', 'B']);
    expect(rows[0]).toMatchObject({
      name: 'A',
      level: 0,
      totalHeadcount: 16,
      totalBudget: 140,
    });
    expect(rows[0]?.weightedPerformance).toBeCloseTo(68.75);
    expect(rows[1]).toMatchObject({
      totalHeadcount: 6,
      totalBudget: 40,
      weightedPerformance: 100,
    });
  });
});

describe('filterRowsByName', () => {
  const rows = rowsOf(orgNode('eng', 'Инженерия'), orgNode('web', 'Web', { parentId: 'eng' }));

  it('substring без учёта регистра, пустой запрос не фильтрует', () => {
    expect(filterRowsByName(rows, '')).toHaveLength(2);
    expect(filterRowsByName(rows, '  WEB  ').map((row) => row.id)).toEqual(['web']);
    expect(filterRowsByName(rows, 'ИНЖ')).toHaveLength(1);
  });
});

describe('sortRows', () => {
  const rows = rowsOf(
    orgNode('b', 'Бета', { headcount: 2, budget: 20, performance: 10 }),
    orgNode('a', 'Альфа', {
      parentId: 'b',
      headcount: 8,
      budget: 80,
      performance: 90,
    }),
  );

  it('клик — asc по имени, двойной — desc', () => {
    expect(sortRows(rows, 'name', 'asc').map((row) => row.id)).toEqual(['a', 'b']);
    expect(sortRows(rows, 'name', 'desc').map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('сортирует суммарный бюджет, не сырой', () => {
    const sorted = sortRows(rows, 'totalBudget', 'desc');
    expect(sorted[0]?.id).toBe('b');
    expect(sorted[0]?.totalBudget).toBe(100);
  });
});

describe('nextHeaderSort', () => {
  it('повторный клик снимает asc, повторный двойной — desc', () => {
    expect(nextHeaderSort(null, 'name', 'click')).toEqual({ column: 'name', direction: 'asc' });
    expect(nextHeaderSort({ column: 'name', direction: 'asc' }, 'name', 'click')).toBeNull();
    expect(nextHeaderSort(null, 'name', 'dblclick')).toEqual({ column: 'name', direction: 'desc' });
    expect(nextHeaderSort({ column: 'name', direction: 'desc' }, 'name', 'dblclick')).toBeNull();
  });

  it('клик по другой колонке или другой жест переключает направление', () => {
    expect(nextHeaderSort({ column: 'name', direction: 'asc' }, 'level', 'click')).toEqual({
      column: 'level',
      direction: 'asc',
    });
    expect(nextHeaderSort({ column: 'name', direction: 'asc' }, 'name', 'dblclick')).toEqual({
      column: 'name',
      direction: 'desc',
    });
  });
});
