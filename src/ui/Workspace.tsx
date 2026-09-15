import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { OrgTable } from '@/ui/OrgTable'
import { OrgTree } from '@/ui/OrgTree'
import { PaneSkeleton } from '@/ui/PaneSkeleton'
import { StatusPanel } from '@/ui/StatusPanel'
import { NAME_FILTER_DEBOUNCE_MS, useDebouncedValue } from '@/ui/useDebouncedValue'
import { SPLIT_MIN_WIDTH, useContainerMinWidth } from '@/ui/useMinWidth'
import { useStoredView } from '@/ui/useStoredView'
import type { OrgTreeStatus } from '@/data/store'
import type { Aggregate, OrgNode } from '@/domain/types'

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Search = styled.input`
  flex: 1;
  min-width: 180px;
  max-width: 360px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};

  &::placeholder {
    color: ${({ theme }) => theme.colors.muted};
  }

  &:focus {
    outline: 1px solid ${({ theme }) => theme.colors.accent};
  }
`

const Toggle = styled.div`
  display: inline-flex;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surfaceHover : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.muted};
`

const Panes = styled.div<{ $split: boolean }>`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: ${({ $split }) => ($split ? '1fr 1fr' : '1fr')};
  grid-template-rows: 1fr;
`

const Pane = styled.section<{ $divider?: boolean }>`
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: ${({ theme, $divider }) =>
    $divider ? `1px solid ${theme.colors.border}` : 'none'};
`

const PaneTitle = styled.h2`
  margin: 0;
  padding: 8px ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
`

const PaneBody = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
`

type WorkspaceProps = {
  status: OrgTreeStatus
  onRetry: () => void
  roots: string[]
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  expandedIds: Set<string>
  selectedId: string | null
  nameQuery: string
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onNameQuery: (query: string) => void
}

export function Workspace({
  status,
  onRetry,
  roots,
  nodesById,
  childrenByParent,
  aggregates,
  expandedIds,
  selectedId,
  nameQuery,
  onToggle,
  onSelect,
  onNameQuery,
}: WorkspaceProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const wide = useContainerMinWidth(shellRef, SPLIT_MIN_WIDTH)
  const [view, setView] = useStoredView(wide)
  const [draft, setDraft] = useState(nameQuery)
  const debounced = useDebouncedValue(draft, NAME_FILTER_DEBOUNCE_MS)

  useEffect(() => {
    onNameQuery(debounced)
  }, [debounced, onNameQuery])

  const split = view === 'split'
  const showTree = split || view === 'tree'
  const showTable = split || view === 'table'
  const loading = status === 'loading' || status === 'idle'
  const ready = status === 'ready'

  return (
    <Shell ref={shellRef}>
      <Toolbar>
        <Search
          type="search"
          value={draft}
          placeholder="Фильтр по названию"
          aria-label="Фильтр по названию"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Toggle role="tablist" aria-label="Вид">
          <ToggleButton
            type="button"
            role="tab"
            $active={view === 'tree'}
            aria-selected={view === 'tree'}
            onClick={() => setView('tree')}
          >
            Дерево
          </ToggleButton>
          <ToggleButton
            type="button"
            role="tab"
            $active={view === 'table'}
            aria-selected={view === 'table'}
            onClick={() => setView('table')}
          >
            Таблица
          </ToggleButton>
          <ToggleButton
            type="button"
            role="tab"
            $active={view === 'split'}
            aria-selected={view === 'split'}
            hidden={!wide}
            onClick={() => setView('split')}
          >
            Вместе
          </ToggleButton>
        </Toggle>
      </Toolbar>
      {status === 'error' ? (
        <StatusPanel kind="error" onRetry={onRetry} />
      ) : status === 'empty' ? (
        <StatusPanel kind="empty" onRetry={onRetry} />
      ) : (
        <Panes $split={split}>
          {showTree ? (
            <Pane $divider={split} aria-label="Дерево">
              {split ? <PaneTitle>Дерево</PaneTitle> : null}
              <PaneBody>
                {loading ? (
                  <PaneSkeleton variant="tree" />
                ) : ready ? (
                  <OrgTree
                    roots={roots}
                    nodesById={nodesById}
                    childrenByParent={childrenByParent}
                    aggregates={aggregates}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    onToggle={onToggle}
                    onSelect={onSelect}
                  />
                ) : null}
              </PaneBody>
            </Pane>
          ) : null}
          {showTable ? (
            <Pane aria-label="Таблица">
              {split ? <PaneTitle>Таблица</PaneTitle> : null}
              <PaneBody>
                {loading ? (
                  <PaneSkeleton variant="table" />
                ) : ready ? (
                  <OrgTable
                    nodesById={nodesById}
                    childrenByParent={childrenByParent}
                    aggregates={aggregates}
                    nameQuery={nameQuery}
                    selectedId={selectedId}
                    onSelect={onSelect}
                  />
                ) : null}
              </PaneBody>
            </Pane>
          ) : null}
        </Panes>
      )}
    </Shell>
  )
}
