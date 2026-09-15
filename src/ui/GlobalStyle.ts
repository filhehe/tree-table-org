import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    max-height: 100dvh;
    overflow: hidden;
  }

  html {
    color-scheme: dark;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.border} ${({ theme }) => theme.colors.surface};
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  *::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surface};
  }

  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border: 2px solid ${({ theme }) => theme.colors.surface};
    border-radius: 8px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.muted};
  }

  *::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.colors.surface};
  }

  @keyframes org-flash-a {
    from { background-color: rgba(61, 156, 143, 0.32); }
    to { background-color: transparent; }
  }

  @keyframes org-flash-b {
    from { background-color: rgba(61, 156, 143, 0.32); }
    to { background-color: transparent; }
  }

  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.font.sans};
    font-size: 14px;
    line-height: 1.45;
  }

  button {
    font: inherit;
  }
`;
