import 'styled-components'

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      bg: string
      surface: string
      surfaceHover: string
      border: string
      text: string
      muted: string
      accent: string
      selected: string
      danger: string
      performance: {
        low: string
        mid: string
        high: string
      }
    }
    space: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
    }
    radius: string
    font: {
      sans: string
      mono: string
    }
  }
}
