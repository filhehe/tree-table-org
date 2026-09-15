import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
`;

const TreeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
`;

const TreeBar = styled.div<{ $width: string; $indent: string }>`
  height: 36px;
  width: ${({ $width }) => $width};
  margin-left: ${({ $indent }) => $indent};
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.colors.border};
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

const TableList = styled.div`
  display: flex;
  flex-direction: column;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1fr 1.2fr 0.8fr;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const TableCell = styled.div<{ $width: string }>`
  height: 12px;
  width: ${({ $width }) => $width};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

const TREE_BARS = [
  { width: '280px', indent: '0px' },
  { width: '280px', indent: '24px' },
  { width: '240px', indent: '48px' },
  { width: '240px', indent: '48px' },
  { width: '280px', indent: '24px' },
  { width: '240px', indent: '48px' },
  { width: '280px', indent: '0px' },
  { width: '280px', indent: '24px' },
] as const;

const TABLE_ROWS = [
  ['70%', '50%', '40%', '80%', '30%'],
  ['55%', '50%', '35%', '65%', '45%'],
  ['62%', '50%', '50%', '72%', '38%'],
  ['48%', '50%', '42%', '58%', '52%'],
  ['74%', '50%', '38%', '84%', '28%'],
  ['58%', '50%', '46%', '70%', '41%'],
  ['66%', '50%', '33%', '76%', '36%'],
  ['52%', '50%', '44%', '60%', '48%'],
] as const;

type PaneSkeletonProps = {
  variant: 'tree' | 'table';
};

export function PaneSkeleton({ variant }: PaneSkeletonProps) {
  if (variant === 'table') {
    return (
      <TableList aria-busy="true" aria-live="polite" aria-label="Загрузка таблицы">
        {TABLE_ROWS.map((cells, index) => (
          <TableRow key={index}>
            {cells.map((width, cell) => (
              <TableCell key={cell} $width={width} />
            ))}
          </TableRow>
        ))}
      </TableList>
    );
  }

  return (
    <TreeList aria-busy="true" aria-live="polite" aria-label="Загрузка дерева">
      {TREE_BARS.map((bar) => (
        <TreeBar key={`${bar.width}-${bar.indent}`} $width={bar.width} $indent={bar.indent} />
      ))}
    </TreeList>
  );
}
