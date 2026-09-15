import styled from 'styled-components';
import { useOrgConnectionStatus } from '@/data/useOrgTreeSelector';

const HeaderBar = styled.header`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0.01em;
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`;

const Live = styled.p<{ $status: 'live' | 'reconnecting' | 'offline' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

const LiveDot = styled.span<{ $status: 'live' | 'reconnecting' | 'offline' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme, $status }) =>
    $status === 'live'
      ? theme.colors.performance.high
      : $status === 'reconnecting'
        ? theme.colors.performance.mid
        : theme.colors.danger};
`;

const RemountButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

function statusLabel(status: 'live' | 'reconnecting' | 'offline') {
  if (status === 'live') return 'Live';
  if (status === 'reconnecting') return 'Переподключение';
  return 'Офлайн';
}

type HeaderProps = {
  onRemount: () => void;
};

export function Header({ onRemount }: HeaderProps) {
  const connection = useOrgConnectionStatus();

  return (
    <HeaderBar>
      <TopRow>
        <Title>Структура продукта</Title>
        <Actions>
          <Live $status={connection} aria-live="polite">
            <LiveDot $status={connection} />
            {statusLabel(connection)}
          </Live>
          <RemountButton
            type="button"
            onClick={onRemount}
            aria-label="Перемонтировать панель и проверить кэш"
          >
            Перемонтировать
          </RemountButton>
        </Actions>
      </TopRow>
      <Subtitle>Продукт, инженерия, рост, операции</Subtitle>
    </HeaderBar>
  );
}
