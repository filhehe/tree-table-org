import type { Aggregate, OrgIndex } from '@/domain/types';

export type TableRow = {
  id: string;
  name: string;
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  weightedPerformance: number;
};

export type SortColumn = keyof Pick<
  TableRow,
  'name' | 'level' | 'totalHeadcount' | 'totalBudget' | 'weightedPerformance'
>;

export type SortDirection = 'asc' | 'desc';

export type TableSort = { column: SortColumn; direction: SortDirection };

export function nextHeaderSort(
  current: TableSort | null,
  column: SortColumn,
  gesture: 'click' | 'dblclick',
): TableSort | null {
  const direction: SortDirection = gesture === 'click' ? 'asc' : 'desc';
  if (current?.column === column && current.direction === direction) return null;
  return { column, direction };
}

export function projectTableRows(index: OrgIndex, aggregates: Map<string, Aggregate>): TableRow[] {
  const rows: TableRow[] = [];

  const visit = (id: string) => {
    const node = index.nodesById.get(id);
    const aggregate = aggregates.get(id);
    if (!node || !aggregate) return;

    rows.push({
      id,
      name: node.name,
      level: aggregate.level,
      totalHeadcount: aggregate.totalHeadcount,
      totalBudget: aggregate.totalBudget,
      weightedPerformance: aggregate.weightedPerformance,
    });

    for (const childId of index.childrenByParent.get(id) ?? []) {
      visit(childId);
    }
  };

  for (const rootId of index.roots) visit(rootId);
  return rows;
}

export function filterRowsByName(rows: TableRow[], query: string): TableRow[] {
  const needle = query.trim().toLocaleLowerCase('ru-RU');
  if (!needle) return rows;
  return rows.filter((row) => row.name.toLocaleLowerCase('ru-RU').includes(needle));
}

function compareRows(a: TableRow, b: TableRow, column: SortColumn): number {
  if (column === 'name') {
    return a.name.localeCompare(b.name, 'ru');
  }
  return a[column] - b[column];
}

export function sortRows(
  rows: TableRow[],
  column: SortColumn,
  direction: SortDirection,
): TableRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const result = compareRows(a, b, column);
    if (result !== 0) return result * sign;
    return a.id.localeCompare(b.id);
  });
}
