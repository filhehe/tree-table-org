import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { clearSelection, retryOrgTree, selectNode, setNameQuery } from '@/data/store';
import { useOrgNameQuery, useOrgSelectedId, useOrgStatus } from '@/data/useOrgTreeSelector';
import { parseNl } from '@/domain/nlSearch';
import { OrgTable } from '@/ui/OrgTable';
import { OrgTree } from '@/ui/OrgTree';
import { PaneSkeleton } from '@/ui/PaneSkeleton';
import { scheduleScrollToUpperThird } from '@/ui/scrollIntoUpperThird';
import { StatusPanel } from '@/ui/StatusPanel';
import { NAME_FILTER_DEBOUNCE_MS, useDebouncedValue } from '@/ui/useDebouncedValue';
import { SPLIT_MIN_WIDTH, useContainerMinWidth } from '@/ui/useMinWidth';
import { useStoredView } from '@/ui/useStoredView';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Search = styled.input`
  flex: 1;
  min-width: 180px;
  max-width: 420px;
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
`;

const FilterBadge = styled.span`
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.selected};
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const Toggle = styled.div`
  display: inline-flex;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.colors.surfaceHover : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.muted)};
`;

const Panes = styled.div<{ $split: boolean }>`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: ${({ $split }) => ($split ? '1fr 1fr' : '1fr')};
  grid-template-rows: 1fr;
`;

const Pane = styled.section<{ $divider?: boolean; $hidden?: boolean }>`
  min-width: 0;
  min-height: 0;
  display: ${({ $hidden }) => ($hidden ? 'none' : 'flex')};
  flex-direction: column;
  overflow: hidden;
  border-right: ${({ theme, $divider }) =>
    $divider ? `1px solid ${theme.colors.border}` : 'none'};
`;

const PaneTitle = styled.h2`
  margin: 0;
  padding: 8px ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const PaneBody = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
`;

export function Workspace() {
  const status = useOrgStatus();
  const nameQuery = useOrgNameQuery();
  const selectedId = useOrgSelectedId();
  const shellRef = useRef<HTMLDivElement>(null);
  const wide = useContainerMinWidth(shellRef, SPLIT_MIN_WIDTH);
  const [view, setView] = useStoredView(wide);
  const [selectionOrigin, setSelectionOrigin] = useState<'tree' | 'table' | null>(null);
  const [draft, setDraft] = useState(nameQuery);
  const [panesReady, setPanesReady] = useState(status === 'ready');
  const debounced = useDebouncedValue(draft, NAME_FILTER_DEBOUNCE_MS);
  const searchMode = useMemo(() => parseNl(debounced).mode, [debounced]);

  useEffect(() => {
    setNameQuery(debounced);
  }, [debounced]);

  const split = view === 'split';
  const showTree = split || view === 'tree';
  const showTable = split || view === 'table';
  const loading = status === 'loading' || status === 'idle';
  const ready = status === 'ready';

  if (ready && !panesReady) {
    setPanesReady(true);
  }

  const selectFromTree = useCallback((id: string) => {
    setSelectionOrigin('tree');
    selectNode(id);
  }, []);

  const selectFromTable = useCallback((id: string) => {
    setSelectionOrigin('table');
    selectNode(id);
  }, []);

  useEffect(() => {
    if (!selectedId || !selectionOrigin) return;
    if (selectionOrigin === 'tree' && !showTable) return;
    if (selectionOrigin === 'table' && !showTree) return;

    const selector =
      selectionOrigin === 'tree'
        ? `[data-table-id="${CSS.escape(selectedId)}"]`
        : `[data-node-id="${CSS.escape(selectedId)}"]`;

    return scheduleScrollToUpperThird(document.querySelector(selector));
  }, [selectedId, selectionOrigin, showTable, showTree]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearSelection();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-table-id], [data-node-id]')) return;
      clearSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return (
    <Shell ref={shellRef}>
      <Toolbar>
        <Search
          type="search"
          value={draft}
          placeholder="Поиск или фильтр: команды ниже 60"
          aria-label="Поиск и NL-фильтр"
          onChange={(event) => setDraft(event.target.value)}
        />
        {searchMode === 'structured' ? <FilterBadge>Фильтр</FilterBadge> : null}
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
        <StatusPanel kind="error" onRetry={retryOrgTree} />
      ) : status === 'empty' ? (
        <StatusPanel kind="empty" onRetry={retryOrgTree} />
      ) : (
        <Panes $split={split && panesReady}>
          {loading && !panesReady ? (
            <Pane aria-label={showTree ? 'Дерево' : 'Таблица'}>
              <PaneSkeleton variant={showTree ? 'tree' : 'table'} />
            </Pane>
          ) : null}
          {panesReady ? (
            <>
              <Pane $divider={split} $hidden={!showTree} aria-label="Дерево">
                {split ? <PaneTitle>Дерево</PaneTitle> : null}
                <PaneBody data-scroll-pane>
                  <OrgTree onSelect={selectFromTree} />
                </PaneBody>
              </Pane>
              <Pane $hidden={!showTable} aria-label="Таблица">
                {split ? <PaneTitle>Таблица</PaneTitle> : null}
                <PaneBody data-scroll-pane>
                  <OrgTable onSelect={selectFromTable} />
                </PaneBody>
              </Pane>
            </>
          ) : null}
        </Panes>
      )}
    </Shell>
  );
}
