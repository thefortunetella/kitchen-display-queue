import { AppBar, Box, Divider, IconButton, Link, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { formatAgo, formatDate, formatTime } from '../format'
import { useNow } from '../hooks/useNow'
import { BRAND } from '../theme'

const HOW_IT_WORKS =
  'Orders move Received → Preparing → Ready → Finished. The kitchen queue is ranked by priority: ' +
  'start the order marked “Next up”. Hover a position number to see why an order is there.'

interface AppHeaderProps {
  generatedAt: string | null
  refreshing: boolean
  offline: boolean
  autoRefreshSeconds: number
  onRefresh: () => void
}

export function AppHeader({ generatedAt, refreshing, offline, autoRefreshSeconds, onRefresh }: AppHeaderProps) {
  const now = useNow(1000)

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense" sx={{ minHeight: 56, gap: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <ProductMark />
          <Typography component="span" sx={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.2 }}>
            Kitchen Queue
          </Typography>
        </Stack>
        <Divider orientation="vertical" flexItem sx={{ my: 2 }} />
        <Typography component="h1" sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>
          Kitchen Display
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <SyncStatus generatedAt={generatedAt} now={now} offline={offline} autoRefreshSeconds={autoRefreshSeconds} />
        <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatDate(now)} ·{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {formatTime(now.toISOString(), true)}
          </Box>
        </Typography>
        <Tooltip title={refreshing ? 'Refreshing…' : 'Refresh now'}>
          <span>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing…' : 'Refresh now'}
              sx={{
                border: 1,
                borderColor: 'divider',
                '& svg': {
                  '@media (prefers-reduced-motion: no-preference)': refreshing
                    ? { animation: 'spin 0.8s linear infinite' }
                    : {},
                },
                '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
              }}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={HOW_IT_WORKS}>
          <Link component="button" variant="body2" underline="hover" color="text.secondary" sx={{ fontWeight: 600 }}>
            How it works
          </Link>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}

/** Same drawing as the favicon. */
function ProductMark() {
  return (
    <Box component="svg" viewBox="0 0 32 32" sx={{ width: 28, height: 28, display: 'block' }} aria-hidden>
      <rect width="32" height="32" rx="7" fill={BRAND.navy} />
      <rect x="7" y="8" width="18" height="4" rx="2" fill={BRAND.cyan} />
      <rect x="7" y="14" width="14" height="4" rx="2" fill="#ffffff" opacity="0.85" />
      <rect x="7" y="20" width="10" height="4" rx="2" fill="#ffffff" opacity="0.6" />
    </Box>
  )
}

function SyncStatus({
  generatedAt,
  now,
  offline,
  autoRefreshSeconds,
}: {
  generatedAt: string | null
  now: Date
  offline: boolean
  autoRefreshSeconds: number
}) {
  const text = offline
    ? `Offline · retrying every ${autoRefreshSeconds} s`
    : generatedAt
      ? `Synced ${formatAgo(new Date(generatedAt), now)}`
      : 'Connecting…'

  return (
    <Tooltip title={`The screen updates itself every ${autoRefreshSeconds} seconds.`}>
      <Stack direction="row" alignItems="center" spacing={0.75} aria-live="polite">
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: offline ? 'error.main' : '#2e9d5b' }} />
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap', color: offline ? 'error.main' : 'text.secondary' }}>
          {text}
        </Typography>
      </Stack>
    </Tooltip>
  )
}
