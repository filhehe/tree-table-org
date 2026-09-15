import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { formatBudget, formatHeadcount, formatLevel, formatPerformance } from '@/domain/format'
import {
  filterRowsByName,
  projectTableRows,
  sortRows,
  type SortColumn,
  type SortDirection,
} from '@/domain/table'
import type { Aggregate, OrgNode } from '@/domain/types'

const CLICK_DELAY_MS = 280

const Wrap = styled.div`
  min-height: 0;
  width: max-content;
  min-width: 100%;
`

const Table = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-variant-numeric: tabular-nums;
`

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
`

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
`

const Td = styled.td<{ $numeric?: boolean }>`
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 13px;
  text-align: ${({ $numeric }) => ($numeric ? 'right' : 'left')};
  white-space: nowrap;
`

const Row = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.selected : 'transparent'};

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.selected : theme.colors.surfaceHover};
  }
`

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space.xl};
  color: ${({ theme }) => theme.colors.muted};
`

const COLUMNS: { id: SortColumn; label: string; numeric?: boolean }[] = [
  { id: 'name', label: 'Подразделение' },
  { id: 'level', label: 'Уровень' },
  { id: 'totalHeadcount', label: 'Всего сотрудников', numeric: true },
  { id: 'totalBudget', label: 'Бюджет суммарный', numeric: true },
  { id: 'weightedPerformance', label: 'Средняя эффективность', numeric: true },
]

type OrgTableProps = {
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  nameQuery: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function OrgTable({
  nodesById,
  childrenByParent,
  aggregates,
  nameQuery,
  selectedId,
  onSelect,
}: OrgTableProps) {
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection } | null>(
    null,
  )
  const clickTimer = useRef<number>(0)

  useEffect(() => {
    return () => window.clearTimeout(clickTimer.current)
  }, [])

  const rows = useMemo(() => {
    const projected = projectTableRows(
      {
        nodesById,
        childrenByParent,
        roots: childrenByParent.get(null) ?? [],
        levels: new Map(),
      },
      aggregates,
    )
    const filtered = filterRowsByName(projected, nameQuery)
    return sort ? sortRows(filtered, sort.column, sort.direction) : filtered
  }, [aggregates, childrenByParent, nameQuery, nodesById, sort])

  const onHeaderClick = (column: SortColumn, detail: number) => {
    window.clearTimeout(clickTimer.current)
    if (detail > 1) return
    clickTimer.current = window.setTimeout(() => {
      setSort({ column, direction: 'asc' })
    }, CLICK_DELAY_MS)
  }

  const onHeaderDoubleClick = (column: SortColumn) => {
    window.clearTimeout(clickTimer.current)
    setSort({ column, direction: 'desc' })
  }

  if (rows.length === 0) {
    return <Empty>Ничего не найдено по названию.</Empty>
  }

  return (
    <Wrap>
      <Table>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sort?.column === column.id
              const ariaSort = !active
                ? 'none'
                : sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
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
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row
              key={row.id}
              data-table-id={row.id}
              $selected={row.id === selectedId}
              aria-selected={row.id === selectedId}
              onClick={() => onSelect(row.id)}
            >
              <Td>{row.name}</Td>
              <Td>{formatLevel(row.level)}</Td>
              <Td $numeric>{formatHeadcount(row.totalHeadcount)}</Td>
              <Td $numeric>{formatBudget(row.totalBudget)}</Td>
              <Td $numeric>{formatPerformance(row.weightedPerformance)}</Td>
            </Row>
          ))}
        </tbody>
      </Table>
    </Wrap>
  )
}
