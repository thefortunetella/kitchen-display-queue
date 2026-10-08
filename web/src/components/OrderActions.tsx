import { Button, IconButton, Stack, Tooltip } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import type { Order, OrderAction } from '../api/orders'
import { ACTION_LABEL, actionLabel } from '../format'

interface OrderActionsProps {
  order: Order
  disabled: boolean
  /** Filled primary button (used for the Next up row). */
  emphasized?: boolean
  onAction: (order: Order, action: OrderAction) => void
}

// Renders the actions listed in `allowed_actions`; the state machine lives on the server.
export function OrderActions({ order, disabled, emphasized = false, onAction }: OrderActionsProps) {
  const forward = order.allowed_actions.filter((action) => action !== 'cancel')
  const canCancel = order.allowed_actions.includes('cancel')

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {forward.map((action) => (
        <Button
          key={action}
          size="small"
          variant={emphasized ? 'contained' : 'outlined'}
          disabled={disabled}
          onClick={() => onAction(order, action)}
          aria-label={`${actionLabel(action)}: order ${order.id}`}
          sx={{ width: 136, whiteSpace: 'nowrap', ...(!emphasized && { bgcolor: 'background.paper' }) }}
        >
          {actionLabel(action)}
        </Button>
      ))}
      {canCancel && (
        <Tooltip title={ACTION_LABEL.cancel}>
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={() => onAction(order, 'cancel')}
              aria-label={`${ACTION_LABEL.cancel}: order ${order.id}`}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(198, 40, 40, 0.08)' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  )
}
