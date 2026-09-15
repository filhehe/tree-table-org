import styled from 'styled-components'
import { OrgTreeNodeRow } from '@/ui/OrgTreeNodeRow'
import type { Aggregate, OrgNode } from '@/domain/types'

const Tree = styled.div`
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  width: max-content;
  min-width: 100%;
`

const Branch = styled.div`
  position: relative;
`

const NodeRow = styled.div<{ $connect: boolean }>`
  position: relative;
  display: flex;
  width: fit-content;

  ${({ $connect, theme }) =>
    $connect
      ? `
    &::before {
      content: '';
      position: absolute;
      left: -13px;
      top: 50%;
      width: 13px;
      border-top: 1px dotted ${theme.colors.muted};
      z-index: 0;
    }
  `
      : ''}
`

const LastRailMask = styled.span`
  position: absolute;
  left: -14px;
  top: 50%;
  bottom: 0;
  width: 4px;
  background: ${({ theme }) => theme.colors.surface};
  z-index: 1;
  pointer-events: none;
`

const LastRailFill = styled.span`
  position: absolute;
  left: -14px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: ${({ theme }) => theme.colors.surface};
  z-index: 1;
  pointer-events: none;
`

const ChildList = styled.div`
  position: relative;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: -10px;
    bottom: 0;
    border-left: 1px dotted ${({ theme }) => theme.colors.muted};
  }
`

type OrgTreeProps = {
  roots: string[]
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  expandedIds: Set<string>
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}

export function OrgTree({
  roots,
  nodesById,
  childrenByParent,
  aggregates,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
}: OrgTreeProps) {

  return (
    <Tree role="tree" aria-label="Орг-структура">
      {roots.map((id, index) => (
        <OrgTreeBranch
          key={id}
          id={id}
          nodesById={nodesById}
          childrenByParent={childrenByParent}
          aggregates={aggregates}
          expandedIds={expandedIds}
          selectedId={selectedId}
          isLast={index === roots.length - 1}
          isRoot
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </Tree>
  )
}

type BranchProps = {
  id: string
  nodesById: Map<string, OrgNode>
  childrenByParent: Map<string | null, string[]>
  aggregates: Map<string, Aggregate>
  expandedIds: Set<string>
  selectedId: string | null
  isLast: boolean
  isRoot: boolean
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}

function OrgTreeBranch({
  id,
  nodesById,
  childrenByParent,
  aggregates,
  expandedIds,
  selectedId,
  isLast,
  isRoot,
  onToggle,
  onSelect,
}: BranchProps) {
  const node = nodesById.get(id)
  if (!node) return null

  const children = childrenByParent.get(id) ?? []
  const hasChildren = children.length > 0
  const expanded = expandedIds.has(id)

  return (
    <Branch>
      <NodeRow $connect={!isRoot}>
        {!isRoot && isLast ? <LastRailMask /> : null}
        <OrgTreeNodeRow
          node={node}
          aggregate={aggregates.get(id)}
          hasChildren={hasChildren}
          expanded={expanded}
          selected={id === selectedId}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      </NodeRow>
      {hasChildren && expanded ? (
        <ChildList>
          {!isRoot && isLast ? <LastRailFill /> : null}
          {children.map((childId, index) => (
            <OrgTreeBranch
              key={childId}
              id={childId}
              nodesById={nodesById}
              childrenByParent={childrenByParent}
              aggregates={aggregates}
              expandedIds={expandedIds}
              selectedId={selectedId}
              isLast={index === children.length - 1}
              isRoot={false}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ChildList>
      ) : null}
    </Branch>
  )
}
