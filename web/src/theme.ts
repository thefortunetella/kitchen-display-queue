import { createTheme } from '@mui/material'

// Neutral palette with colour reserved for status, the primary action and lateness.
// Text colours meet WCAG AA (4.5:1): #02AACE with white text does not (2.75:1), so it is only
// used on navy; buttons and text on white use #007C99.
export const BRAND = {
  navy: '#061925',
  cyan: '#02AACE', // accent on navy only
  cyanDeep: '#007C99', // on white
} as const

/** Badge colours: tinted background, darker text, light border. */
export const BADGE = {
  info: { bg: '#e8f4f7', fg: '#005a6e', border: '#c4e3eb' },
  warning: { bg: '#fdf1e4', fg: '#8a3a00', border: '#f4d3b0' },
  success: { bg: '#e9f5ea', fg: '#1b5e20', border: '#c6e3c8' },
  neutral: { bg: '#f1f3f5', fg: '#3d4c55', border: '#dde2e6' },
  vip: { bg: '#fff8e1', fg: '#6d4c00', border: '#f1dfa4' },
} as const

export const theme = createTheme({
  palette: {
    primary: { main: BRAND.cyanDeep, dark: '#006379', contrastText: '#ffffff' },
    secondary: { main: BRAND.navy, contrastText: '#ffffff' },
    error: { main: '#c62828' },
    text: { primary: BRAND.navy, secondary: '#5b6770' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    divider: '#e8ebee',
  },
  typography: {
    fontFamily: '"Nunito Sans Variable", "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: '#e8ebee' } } },
    MuiTooltip: {
      defaultProps: { enterTouchDelay: 0, leaveTouchDelay: 6000, arrow: true },
      styleOverrides: { tooltip: { fontSize: 12, backgroundColor: BRAND.navy }, arrow: { color: BRAND.navy } },
    },
    MuiSnackbarContent: { styleOverrides: { root: { backgroundColor: BRAND.navy, fontWeight: 600 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#eef0f2', padding: '10px 12px' },
        head: {
          fontWeight: 700,
          fontSize: 11.5,
          color: '#5b6770',
          backgroundColor: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          whiteSpace: 'nowrap',
          borderBottomColor: '#e8ebee',
        },
      },
    },
  },
})
