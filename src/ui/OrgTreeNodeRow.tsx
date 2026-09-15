import styled from 'styled-components'
import { formatHeadcount, formatPerformance } from '@/domain/format'
import { performanceBand } from '@/domain/performance'
import type { Aggregate, OrgNode } from '@/domain/types'

const Card = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 280px;
  margin: 10px 10px 10px 0;
  padding: 10px 12px;
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.accent : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.selected : theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  position: relative;
  z-index: 1;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.selected : theme.colors.surfaceHover};
  }
`

const CardTop = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-width: 0;
`

const ChevronHit = styled.span<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
  cursor: ${({ $hidden }) => ($hidden ? 'default' : 'pointer')};
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 5px 0 5px 7px;
  border-color: transparent transparent transparent currentColor;
  color: ${({ theme }) => theme.colors.muted};
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  transform-origin: 40% 50%;
`

const Name = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  min-width: 0;
`

const UnitLabel = styled.span`
  padding-left: 15px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const Stats = styled.span<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: ${({ theme }) => theme.space.sm};
  padding-left: 15px;
`

const Stat = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  letter-spacing: 0.02em;
`

const StatValue = styled.span`
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 600;
`

const Tooltip = styled.span`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 2;
  width: max-content;
  max-width: 220px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
`

const TooltipLine = styled.span`
  display: block;
`

const TooltipMuted = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`

const DotHit = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: -6px -4px -6px 0;
  flex-shrink: 0;

  &:hover {
    z-index: 3;
  }

  &:hover ${Tooltip} {
    opacity: 1;
    visibility: visible;
  }
`

const Dot = styled.span<{ $band: 'low' | 'mid' | 'high' }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme, $band }) => theme.colors.performance[$band]};
`

function bandLabel(band: 'low' | 'mid' | 'high') {
  if (band === 'low') return 'Низкая'
  if (band === 'mid') return 'Средняя'
  return 'Высокая'
}

function unitTitle(level: number) {
  if (level === 0) return 'Сотрудников дивизиона'
  if (level === 1) return 'Сотрудников отдела'
  if (level === 2) return 'Сотрудников команды'
  return 'Сотрудников подразделения'
}

function descendantLabel(level: number) {
  if (level === 0) return 'В отделах'
  if (level === 1) return 'В командах'
  return null
}

type OrgTreeNodeRowProps = {
  node: OrgNode
  aggregate: Aggregate | undefined
  hasChildren: boolean
  expanded: boolean
  selected: boolean
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}

export function OrgTreeNodeRow({
  node,
  aggregate,
  hasChildren,
  expanded,
  selected,
  onToggle,
  onSelect,
}: OrgTreeNodeRowProps) {
  const totalHeadcount = aggregate?.totalHeadcount ?? node.headcount
  const ownHeadcount = node.headcount
  const descendantHeadcount = Math.max(0, totalHeadcount - ownHeadcount)
  const performance = aggregate?.weightedPerformance ?? node.performance
  const band = performanceBand(performance)
  const level = aggregate?.level ?? 0
  const descendantTitle = descendantLabel(level)

  return (
    <Card
      type="button"
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selected}
      data-node-id={node.id}
      $selected={selected}
      onClick={() => onSelect(node.id)}
    >
        <CardTop>
          <ChevronHit
            $hidden={!hasChildren}
            onClick={(event) => {
              event.stopPropagation()
              if (hasChildren) onToggle(node.id)
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Chevron $open={expanded} />
          </ChevronHit>
          <Name>{node.name}</Name>
          <DotHit
            aria-label={`Эффективность ${formatPerformance(performance)}`}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Dot $band={band} />
            <Tooltip>
              <TooltipLine>
                Эффективность: {formatPerformance(performance)} · {bandLabel(band)}
              </TooltipLine>
              {hasChildren ? (
                <>
                  <TooltipLine>Своя: {formatPerformance(node.performance)}</TooltipLine>
                  <TooltipMuted>Средняя по узлу и потомкам, взвешенная по числу сотрудников</TooltipMuted>
                </>
              ) : (
                <TooltipMuted>Показатель этого узла</TooltipMuted>
              )}
            </Tooltip>
          </DotHit>
        </CardTop>
        {hasChildren ? (
          <>
            <UnitLabel>{unitTitle(level)}</UnitLabel>
            <Stats $columns={descendantTitle ? 3 : 2}>
              <Stat>
                <StatLabel>Всего</StatLabel>
                <StatValue>{formatHeadcount(totalHeadcount)}</StatValue>
              </Stat>
              <Stat>
                <StatLabel>Своих</StatLabel>
                <StatValue>{formatHeadcount(ownHeadcount)}</StatValue>
              </Stat>
              {descendantTitle ? (
                <Stat>
                  <StatLabel>{descendantTitle}</StatLabel>
                  <StatValue>{formatHeadcount(descendantHeadcount)}</StatValue>
                </Stat>
              ) : null}
            </Stats>
          </>
        ) : (
          <UnitLabel>Сотрудников: {formatHeadcount(ownHeadcount)}</UnitLabel>
        )}
    </Card>
  )
}
