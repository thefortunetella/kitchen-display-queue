// Styles shared by the order tables.

export const numeric = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const

// Same widths in every table; Items takes the remaining space.
export const COLUMN_WIDTH = {
  priority: 96,
  order: 168,
  vip: 72,
  type: 120,
  time: 104, // Waiting, Ready for, Finished
  promised: 136,
  status: 112,
  outcome: 120,
  actions: 190,
} as const

// Keeps the actions column visible when the table scrolls horizontally.
export const pinnedRight = {
  position: 'sticky',
  right: 0,
  bgcolor: 'background.paper',
} as const

// Visually hidden, still read by screen readers.
export const srOnly = {
  position: 'absolute',
  width: '1px', // a bare 1 would mean 100% in sx
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

export const rowSx = {
  '& > td': { borderBottomColor: '#f0f2f4' },
  '&:hover > td': { bgcolor: '#f8fafb' },
  '&:last-of-type > td': { borderBottom: 0 },
} as const
