import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import styled from 'styled-components';
import { getOrgTreeSnapshot, selectNode } from '@/data/store';
import {
  useOrgAggregate,
  useOrgNameQuery,
  useOrgNode,
  useOrgSelected,
  useOrgTreeSelector,
  useOrgUpdatedTick,
} from '@/data/useOrgTreeSelector';
import { formatBudget, formatHeadcount, formatLevel, formatPerformance } from '@/domain/format';
import {
  filterRowsByName,
  nextHeaderSort,
  projectTableRows,
  sortRows,
  type SortColumn,
  type TableSort,
} from '@/domain/table';
import { isTableMoveKey, isTableNavKey, nextTableRowId } from '@/domain/tableNav';
import type { OrgIndex } from '@/domain/types';
import { flashAnimation, flashReduce } from '@/ui/flash';
import { usePrefersReducedMotion } from '@/ui/prefersReducedMotion';

const CLICK_DELAY_MS = 280;

const Wrap = styled.div`
  min-height: 0;
  width: max-content;
  min-width: 100%;

  &:focus {
    outline: none;
  }
`;

const Table = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-variant-numeric: tabular-nums;
`;

const Th = styled.th<{ $numeric?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: ${({ $numeric }) => ($numeric ? 'right' : 'left')};
  white-space: nowrap;
  user-select: none;
`;

const SortButton = styled.button<{ $numeric?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $numeric }) => ($numeric ? 'flex-end' : 'flex-start')};
  width: 100%;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Td = styled.td<{ $numeric?: boolean; $tick?: number }>`
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  text-align: ${({ $numeric }) => ($numeric ? 'right' : 'left')};
  white-space: nowrap;
  ${({ $tick }) => flashAnimation($tick ?? 0)}
  ${flashReduce}
`;

const Row = styled.tr<{ $selected: boolean; $cursor: boolean }>`
  cursor: pointer;
  background: ${({ theme, $selected, $cursor }) =>
    $selected ? theme.colors.selected : $cursor ? theme.colors.surfaceHover : 'transparent'};

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.selected : theme.colors.surfaceHover};
  }
`;

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space.xl};
  color: ${({ theme }) => theme.colors.muted};
`;

const COLUMNS: { id: SortColumn; label: string; numeric?: boolean }[] = [
  { id: 'name', label: 'Подразделение' },
  { id: 'level', label: 'Уровень' },
  { id: 'totalHeadcount', label: 'Всего сотрудников', numeric: true },
  { id: 'totalBudget', label: 'Бюджет суммарный', numeric: true },
  { id: 'weightedPerformance', label: 'Средняя эффективность', numeric: true },
];

type OrgTableProps = {
  onSelect?: (id: string) => void;
};

export const OrgTable = memo(function OrgTable({ onSelect }: OrgTableProps) {
  const childrenByParent = useOrgTreeSelector((state) => state.childrenByParent);
  const nameQuery = useOrgNameQuery();
  const select = onSelect ?? selectNode;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [sort, setSort] = useState<TableSort | null>(null);
  const clickTimer = useRef<number>(0);
  const sortSignature = sort ? `${sort.column}:${sort.direction}` : '';
  const aggregates = useOrgTreeSelector((state) => (sortSignature ? state.aggregates : null));

  useEffect(() => {
    return () => window.clearTimeout(clickTimer.current);
  }, []);

  const ids = useMemo(() => {
    const snapshot = getOrgTreeSnapshot();
    const index: OrgIndex = {
      nodesById: snapshot.nodesById,
      childrenByParent,
      roots: childrenByParent.get(null) ?? [],
      levels: new Map(),
    };
    const projected = projectTableRows(index, snapshot.aggregates);
    const filtered = filterRowsByName(projected, nameQuery);
    const ordered = sort ? sortRows(filtered, sort.column, sort.direction) : filtered;
    return ordered.map((row) => row.id);
  }, [aggregates, childrenByParent, nameQuery, sort]);

  useEffect(() => {
    setCursorId((current) => {
      if (!current) return current;
      if (ids.length === 0) return null;
      if (ids.includes(current)) return current;
      return ids[0]!;
    });
  }, [ids]);

  const onHeaderClick = (column: SortColumn, detail: number) => {
    window.clearTimeout(clickTimer.current);
    if (detail > 1) return;
    clickTimer.current = window.setTimeout(() => {
      setSort((current) => nextHeaderSort(current, column, 'click'));
    }, CLICK_DELAY_MS);
  };

  const onHeaderDoubleClick = (column: SortColumn) => {
    window.clearTimeout(clickTimer.current);
    setSort((current) => nextHeaderSort(current, column, 'dblclick'));
  };

  const focusRow = (id: string) => {
    const row = wrapRef.current?.querySelector(`[data-table-id="${CSS.escape(id)}"]`);
    if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isTableNavKey(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter') {
      const rowId = cursorId ?? ids[0];
      if (!rowId) return;
      if (!cursorId) setCursorId(rowId);
      select(rowId);
      return;
    }
    if (!isTableMoveKey(event.key)) return;
    const next = nextTableRowId(ids, cursorId, event.key);
    if (!next) return;
    setCursorId(next);
    focusRow(next);
  };

  if (ids.length === 0) {
    return <Empty>Ничего не найдено по названию.</Empty>;
  }

  return (
    <Wrap
      ref={wrapRef}
      tabIndex={0}
      role="region"
      aria-label="Навигация по таблице"
      aria-activedescendant={cursorId ? `table-row-${cursorId}` : undefined}
      onMouseDown={() => wrapRef.current?.focus()}
      onKeyDown={onKeyDown}
    >
      <Table>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sort?.column === column.id;
              const ariaSort = !active
                ? 'none'
                : sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending';
              return (
                <Th key={column.id} $numeric={column.numeric} aria-sort={ariaSort}>
                  <SortButton
                    type="button"
                    $numeric={column.numeric}
                    onClick={(event) => onHeaderClick(column.id, event.detail)}
                    onDoubleClick={() => onHeaderDoubleClick(column.id)}
                  >
                    {column.label}
                    {active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                  </SortButton>
                </Th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => (
            <TableRow
              key={id}
              id={id}
              cursor={cursorId === id}
              onSelect={(rowId) => {
                setCursorId(rowId);
                select(rowId);
                wrapRef.current?.focus();
              }}
            />
          ))}
        </tbody>
      </Table>
    </Wrap>
  );
});

const TableRow = memo(function TableRow({
  id,
  cursor,
  onSelect,
}: {
  id: string;
  cursor: boolean;
  onSelect: (id: string) => void;
}) {
  const node = useOrgNode(id);
  const aggregate = useOrgAggregate(id);
  const selected = useOrgSelected(id);
  const reduced = usePrefersReducedMotion();
  const headcountTick = useOrgUpdatedTick(id, 'totalHeadcount');
  const budgetTick = useOrgUpdatedTick(id, 'totalBudget');
  const performanceTick = useOrgUpdatedTick(id, 'weightedPerformance');
  if (!node || !aggregate) return null;

  return (
    <Row
      id={`table-row-${id}`}
      data-table-id={id}
      $selected={selected}
      $cursor={cursor}
      aria-selected={selected}
      onClick={() => onSelect(id)}
    >
      <Td>{node.name}</Td>
      <Td>{formatLevel(aggregate.level)}</Td>
      <Td
        $numeric
        data-updated={headcountTick ? 'totalHeadcount' : undefined}
        $tick={reduced ? 0 : headcountTick}
      >
        {formatHeadcount(aggregate.totalHeadcount)}
      </Td>
      <Td
        $numeric
        data-updated={budgetTick ? 'totalBudget' : undefined}
        $tick={reduced ? 0 : budgetTick}
      >
        {formatBudget(aggregate.totalBudget)}
      </Td>
      <Td
        $numeric
        data-updated={performanceTick ? 'weightedPerformance' : undefined}
        $tick={reduced ? 0 : performanceTick}
      >
        {formatPerformance(aggregate.weightedPerformance)}
      </Td>
    </Row>
  );
});
