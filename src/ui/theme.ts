import type { DefaultTheme } from 'styled-components'

export const theme: DefaultTheme = {
  colors: {
    bg: '#10151c',
    surface: '#18212c',
    surfaceHover: '#1f2b39',
    border: '#2b3a4c',
    text: '#e8eef4',
    muted: '#8b9aab',
    accent: '#3d9c8f',
    danger: '#d46565',
    performance: {
      low: '#d46565',
      mid: '#d4a24c',
      high: '#3dbf8a',
    },
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '20px',
    xl: '32px',
  },
  radius: '10px',
  font: {
    sans: 'Inter, "Segoe UI", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
}
