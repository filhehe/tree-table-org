import styled from "styled-components";

const HeaderBar = styled.header`
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

type HeaderProps = {
  onRemount: () => void;
};

export function Header({ onRemount }: HeaderProps) {
  return (
    <HeaderBar>
      <TopRow>
        <Title>Структура продукта</Title>
        <RemountButton
          type="button"
          onClick={onRemount}
          aria-label="Перемонтировать панель и проверить кэш"
        >
          Перемонтировать
        </RemountButton>
      </TopRow>
      <Subtitle>Продукт, инженерия, рост, операции</Subtitle>
    </HeaderBar>
  );
}
