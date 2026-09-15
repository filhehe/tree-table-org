import { useState } from 'react'
import styled from 'styled-components'
import { useOrgTree } from '@/data/useOrgTree'
import { Header } from '@/ui/Header'
import { OrgTree } from '@/ui/OrgTree'
import { StatusPanel } from '@/ui/StatusPanel'

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const Main = styled.main`
  flex: 1;
  margin: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius};
  overflow: auto;
`

export function App() {
  const [viewId, setViewId] = useState(0)

  return (
    <Shell>
      <Header onRemount={() => setViewId((current) => current + 1)} />
      <Main>
        <Dashboard key={viewId} />
      </Main>
    </Shell>
  )
}

function Dashboard() {
  const tree = useOrgTree()

  if (tree.status === 'loading' || tree.status === 'idle') {
    return <StatusPanel kind="loading" />
  }

  if (tree.status === 'error') {
    return (
      <StatusPanel kind="error" message={tree.error?.message} onRetry={tree.retry} />
    )
  }

  if (tree.status === 'empty') {
    return <StatusPanel kind="empty" />
  }

  const roots = tree.childrenByParent.get(null) ?? []

  return (
    <OrgTree
      roots={roots}
      nodesById={tree.nodesById}
      childrenByParent={tree.childrenByParent}
      aggregates={tree.aggregates}
      expandedIds={tree.expandedIds}
      onToggle={tree.toggleExpanded}
    />
  )
}
