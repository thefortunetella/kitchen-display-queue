import { Box, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { Order, OrderAction, QueueFilter } from '../api/orders'
import { EMPTY_MESSAGE, formatDuration, formatTime, statusLabel, statusTone } from '../format'
import { Badge, DurationCell, ItemsCell, OrderCell, PromisedCell, TypeCell, VipCell } from './cells'
import { OrderActions } from './OrderActions'
import { OrdersTableShell } from './OrdersTableShell'
import type { Column } from './OrdersTableShell'
import { ScoreExplanation } from './ScoreExplanation'
import { COLUMN_WIDTH, numeric, pinnedRight, rowSx } from './tableStyles'

const COLUMNS: Column[] = [
  {
    label: '# · Score',
    width: COLUMN_WIDTH.priority,
    help: 'Position in the queue and its priority score. Hover the number to see why it is there.',
  },
  { label: 'Customer', width: COLUMN_WIDTH.order },
  { label: 'VIP', width: COLUMN_WIDTH.vip },
  { label: 'Type', width: COLUMN_WIDTH.type },
  { label: 'Items' },
  { label: 'Waiting', width: COLUMN_WIDTH.time },
  { label: 'Promised', width: COLUMN_WIDTH.promised },
  { label: 'Status', width: COLUMN_WIDTH.status },
  { label: 'Next step', width: COLUMN_WIDTH.actions },
]

interface QueueTableProps {
  orders: Order[] | null
  filter: QueueFilter
  loading: boolean
  pendingOrderId: number | null
  onAction: (order: Order, action: OrderAction) => void
}

// Rows are rendered in API order. "Next up" is the highest-ranked order that can be started.
export function QueueTable({ orders, filter, loading, pendingOrderId, onAction }: QueueTableProps) {
  const nextUpId = orders?.find((order) => order.allowed_actions.includes('start'))?.id

  return (
    <OrdersTableShell
      label="Kitchen queue"
      columns={COLUMNS}
      pinLastColumn
      loading={loading}
      isEmpty={orders?.length === 0}
      emptyMessage={EMPTY_MESSAGE[filter]}
    >
      {orders?.map((order, index) => {
        const isNext = order.id === nextUpId
        return (
          <TableRow
            key={order.id}
            sx={{
              ...rowSx,
              ...(isNext && {
                '& > td': { bgcolor: '#f3f9fb' },
                '& > td:first-of-type': { boxShadow: (t) => `inset 3px 0 0 ${t.palette.primary.main}` },
              }),
            }}
          >
            <TableCell>
              <ScoreExplanation
                order={order}
                position={index + 1}
                next={orders.find((other) => other.id === order.ahead_of_next?.order_id)}
              >
                <Box
                  tabIndex={0}
                  aria-label={`Order #${order.id}, position ${index + 1}, score ${order.score}. Why is it here?`}
                  sx={{ cursor: 'help', borderRadius: 1, width: 'fit-content', outlineOffset: 2 }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography sx={{ ...numeric, fontWeight: 800, fontSize: 16 }}>{index + 1}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={numeric}>
                      {order.score} pts
                    </Typography>
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} aria-hidden />
                  </Stack>
                </Box>
              </ScoreExplanation>
            </TableCell>
            <TableCell>
              <OrderCell order={order} />
              {isNext && (
                <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 800 }}>
                  Next up
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <VipCell isVip={order.is_vip} />
            </TableCell>
            <TableCell>
              <TypeCell type={order.type} />
            </TableCell>
            <TableCell>
              <ItemsCell order={order} />
            </TableCell>
            <TableCell>
              <DurationCell minutes={order.wait_minutes} detail={`Placed at ${formatTime(order.placed_at)}`} />
            </TableCell>
            <TableCell>
              <PromisedCell order={order} />
            </TableCell>
            <TableCell>
              <Tooltip
                placement="top"
                title={statusDetail(order)}
              >
                <Box aria-label={`Status: ${statusLabel(order.status)}`} sx={{ width: 'fit-content' }}>
                  <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell sx={pinnedRight}>
              <OrderActions order={order} disabled={pendingOrderId === order.id} emphasized={isNext} onAction={onAction} />
            </TableCell>
          </TableRow>
        )
      })}
    </OrdersTableShell>
  )
}

function statusDetail(order: Order): string {
  if (order.status === 'preparing') return `Preparing for ${formatDuration(order.minutes_in_status)}`
  if (order.status === 'received') return 'Not started yet'
  return `${statusLabel(order.status)} for ${formatDuration(order.minutes_in_status)}`
}
