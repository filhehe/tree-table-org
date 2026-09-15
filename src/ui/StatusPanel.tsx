import styled, { css } from 'styled-components'

const CenterPanel = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.xl};
  text-align: center;
`

const Title = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`

const Face = styled.span`
  font-size: 48px;
  line-height: 1;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`

const actionState = css`
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.muted};
    color: ${({ theme }) => theme.colors.text};
  }

  &:active {
    background: ${({ theme }) => theme.colors.selected};
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.text};
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 1px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`

const ActionButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radius};
  padding: 8px 14px;
  cursor: pointer;
  ${actionState}
`

const SupportLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 28ch;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  border-radius: ${({ theme }) => theme.radius};
  padding: 8px 14px;
  text-decoration: none;
  line-height: 1.35;
  ${actionState}
`

const SUPPORT_HREF =
  'mailto:support@orgtree.dev?subject=%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8%20%D0%BE%D1%80%D0%B3-%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D1%8B'

type StatusPanelProps = {
  kind: 'error' | 'empty'
  onRetry?: () => void
}

export function StatusPanel({ kind, onRetry }: StatusPanelProps) {
  if (kind === 'empty') {
    return (
      <CenterPanel>
        <Title>Данных пока нет</Title>
        <Face role="img" aria-label="Робот">
          🤖
        </Face>
        {onRetry ? (
          <ActionButton type="button" onClick={onRetry}>
            Обновить
          </ActionButton>
        ) : null}
      </CenterPanel>
    )
  }

  return (
    <CenterPanel role="alert">
      <Title>У нас что-то сломалось</Title>
      <Face role="img" aria-label="Робот растерян">
        😵
      </Face>
      <Actions>
        {onRetry ? (
          <ActionButton type="button" onClick={onRetry}>
            Обновить
          </ActionButton>
        ) : null}
        <SupportLink href={SUPPORT_HREF}>
          Если ошибка будет повторяться, напишите нам
        </SupportLink>
      </Actions>
    </CenterPanel>
  )
}
