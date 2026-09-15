import styled, { keyframes } from 'styled-components'

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.xl};
  color: ${({ theme }) => theme.colors.muted};
`

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`

const Message = styled.p`
  margin: 0;
  max-width: 52ch;
`

const RetryButton = styled.button`
  align-self: flex-start;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radius};
  padding: 8px 14px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
`

const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const SkeletonBar = styled.div<{ $width: string; $indent: string }>`
  height: 14px;
  width: ${({ $width }) => $width};
  margin-left: ${({ $indent }) => $indent};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
  animation: ${pulse} 1.2s ease-in-out infinite;
`

const SKELETON_BARS = [
  { width: '42%', indent: '0px' },
  { width: '36%', indent: '22px' },
  { width: '48%', indent: '44px' },
  { width: '40%', indent: '44px' },
  { width: '34%', indent: '22px' },
  { width: '46%', indent: '44px' },
  { width: '38%', indent: '0px' },
  { width: '31%', indent: '22px' },
] as const

type StatusPanelProps = {
  kind: 'loading' | 'error' | 'empty'
  message?: string
  onRetry?: () => void
}

export function StatusPanel({ kind, message, onRetry }: StatusPanelProps) {
  if (kind === 'loading') {
    return (
      <Panel aria-busy="true" aria-live="polite">
        <Title>Загрузка дерева</Title>
        <SkeletonList>
          {SKELETON_BARS.map((bar) => (
            <SkeletonBar
              key={`${bar.width}-${bar.indent}`}
              $width={bar.width}
              $indent={bar.indent}
            />
          ))}
        </SkeletonList>
      </Panel>
    )
  }

  if (kind === 'empty') {
    return (
      <Panel>
        <Title>Пустой ответ</Title>
        <Message>API вернул валидный пустой список подразделений.</Message>
      </Panel>
    )
  }

  return (
    <Panel role="alert">
      <Title>Не удалось загрузить данные</Title>
      <Message>{message ?? 'Неизвестная ошибка'}</Message>
      {onRetry ? (
        <RetryButton type="button" onClick={onRetry}>
          Повторить
        </RetryButton>
      ) : null}
    </Panel>
  )
}
