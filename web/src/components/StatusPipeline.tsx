import { Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import type { View } from '../format'
import { VIEW_HINT, VIEW_LABEL } from '../format'

interface StatusPipelineProps {
  value: View
  counts: Partial<Record<View, number>>
  lateOrderIds: number[]
  onChange: (view: View) => void
}

// View switcher laid out in lifecycle order. The first three steps are the queue filter.
export function StatusPipeline({ value, counts, lateOrderIds, onChange }: StatusPipelineProps) {
  const step = (view: View) => (
    <PipelineStep view={view} selected={value === view} count={counts[view]} onSelect={onChange} />
  )
  const arrow = <ChevronRightRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} aria-hidden />

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        role="group"
        aria-label="Show orders"
        sx={{ p: 0.5, borderRadius: 2.5, bgcolor: '#eceff2' }}
      >
        {step('active')}
        <Box sx={{ width: '1px', height: 20, bgcolor: '#d3d9de', mx: 0.75 }} aria-hidden />
        {step('received')}
        {arrow}
        {step('preparing')}
        {arrow}
        {step('ready')}
        {arrow}
        {step('finished')}
      </Stack>

      {lateOrderIds.length > 0 && (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
          ● Promised time passed: {lateOrderIds.map((id) => `#${id}`).join(', ')}
        </Typography>
      )}
    </Stack>
  )
}

function PipelineStep({
  view,
  selected,
  count,
  onSelect,
}: {
  view: View
  selected: boolean
  count: number | undefined
  onSelect: (view: View) => void
}) {
  return (
    <Tooltip title={VIEW_HINT[view]} placement="bottom">
      <ButtonBase
        onClick={() => onSelect(view)}
        aria-pressed={selected}
        aria-label={`${VIEW_LABEL[view]}${count === undefined ? '' : `, ${count} orders`}: ${VIEW_HINT[view]}`}
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          gap: 0.75,
          fontSize: 13,
          fontWeight: 700,
          color: 'text.primary',
          bgcolor: selected ? 'background.paper' : 'transparent',
          boxShadow: selected ? '0 1px 2px rgba(6, 25, 37, 0.12)' : 'none',
          '&:hover': { bgcolor: selected ? 'background.paper' : 'rgba(255, 255, 255, 0.6)' },
        }}
      >
        {VIEW_LABEL[view]}
        {count !== undefined && (
          <Box
            component="span"
            sx={{
              minWidth: 20,
              px: 0.75,
              borderRadius: 999,
              fontSize: 12,
              lineHeight: '20px',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              color: selected ? '#ffffff' : 'text.secondary',
              bgcolor: selected ? 'primary.main' : '#dfe4e8',
            }}
          >
            {count}
          </Box>
        )}
      </ButtonBase>
    </Tooltip>
  )
}
