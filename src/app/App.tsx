import { useState } from 'react'
import styled from 'styled-components'
import { useOrgTree } from '@/data/useOrgTree'
import { Header } from '@/ui/Header'
import { Workspace } from '@/ui/Workspace'

const Shell = styled.div`
  height: 100%;
  width: 100%;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const Stage = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Main = styled.main`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius};
  overflow: hidden;
`

export function App() {
  const [viewId, setViewId] = useState(0)

  return (
    <Shell>
      <Header onRemount={() => setViewId((current) => current + 1)} />
      <Stage>
        <Main>
          <Dashboard key={viewId} />
        </Main>
      </Stage>
    </Shell>
  )
}

function Dashboard() {
  const tree = useOrgTree()
  const roots = tree.childrenByParent.get(null) ?? []

  return (
    <Workspace
      status={tree.status}
      onRetry={tree.retry}
      roots={roots}
      nodesById={tree.nodesById}
      childrenByParent={tree.childrenByParent}
      aggregates={tree.aggregates}
      expandedIds={tree.expandedIds}
      selectedId={tree.selectedId}
      nameQuery={tree.nameQuery}
      onToggle={tree.toggleExpanded}
      onSelect={tree.selectNode}
      onNameQuery={tree.setNameQuery}
    />
  )
}
