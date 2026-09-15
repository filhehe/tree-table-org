import { memo } from 'react';
import styled from 'styled-components';
import { selectNode, toggleExpanded } from '@/data/store';
import {
  useOrgChildren,
  useOrgExpanded,
  useOrgRoots,
  useOrgSelected,
  useOrgTreeSelector,
} from '@/data/useOrgTreeSelector';
import { Expandable } from '@/ui/Expandable';
import { OrgTreeNodeRow } from '@/ui/OrgTreeNodeRow';

const Tree = styled.div`
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  width: max-content;
  min-width: 100%;
`;

const Branch = styled.div`
  position: relative;

  &:hover {
    z-index: 3;
  }
`;

const NodeRow = styled.div<{ $connect: boolean }>`
  position: relative;
  display: flex;
  width: fit-content;
  z-index: 0;

  &:hover,
  &:focus-within {
    z-index: 3;
  }

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
`;

const LastRailMask = styled.span`
  position: absolute;
  left: -14px;
  top: 50%;
  bottom: 0;
  width: 4px;
  background: ${({ theme }) => theme.colors.surface};
  z-index: 1;
  pointer-events: none;
`;

const LastRailFill = styled.span`
  position: absolute;
  left: -14px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: ${({ theme }) => theme.colors.surface};
  z-index: 1;
  pointer-events: none;
`;

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
`;

type OrgTreeProps = {
  onSelect?: (id: string) => void;
};

export const OrgTree = memo(function OrgTree({ onSelect }: OrgTreeProps) {
  const roots = useOrgRoots();
  const select = onSelect ?? selectNode;

  return (
    <Tree role="tree" aria-label="Орг-структура">
      {roots.map((id, index) => (
        <OrgTreeBranch
          key={id}
          id={id}
          isLast={index === roots.length - 1}
          isRoot
          onSelect={select}
        />
      ))}
    </Tree>
  );
});

type BranchProps = {
  id: string;
  isLast: boolean;
  isRoot: boolean;
  onSelect: (id: string) => void;
};

function OrgTreeBranch({ id, isLast, isRoot, onSelect }: BranchProps) {
  const exists = useOrgTreeSelector((state) => state.nodesById.has(id));
  const children = useOrgChildren(id);
  const expanded = useOrgExpanded(id);
  const selected = useOrgSelected(id);
  if (!exists) return null;

  const hasChildren = children.length > 0;

  return (
    <Branch>
      <NodeRow $connect={!isRoot}>
        {!isRoot && isLast ? <LastRailMask /> : null}
        <OrgTreeNodeRow
          id={id}
          hasChildren={hasChildren}
          expanded={expanded}
          selected={selected}
          onToggle={toggleExpanded}
          onSelect={onSelect}
        />
      </NodeRow>
      {hasChildren ? (
        <Expandable id={id} open={expanded}>
          <ChildList>
            {!isRoot && isLast ? <LastRailFill /> : null}
            {children.map((childId, index) => (
              <OrgTreeBranch
                key={childId}
                id={childId}
                isLast={index === children.length - 1}
                isRoot={false}
                onSelect={onSelect}
              />
            ))}
          </ChildList>
        </Expandable>
      ) : null}
    </Branch>
  );
}
