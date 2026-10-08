import { TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import type { Order } from '../api/orders'
import { EMPTY_MESSAGE, formatDuration, formatTime, statusLabel, statusTone } from '../format'
import { Badge, ItemsCell, OrderCell, TypeCell, VipCell } from './cells'
import { OrdersTableShell } from './OrdersTableShell'
import type { Column } from './OrdersTableShell'
import { COLUMN_WIDTH, numeric, rowSx } from './tableStyles'

const COLUMNS: Column[] = [
  { label: 'Customer', width: COLUMN_WIDTH.order },
  { label: 'VIP', width: COLUMN_WIDTH.vip },
  { label: 'Type', width: COLUMN_WIDTH.type },
  { label: 'Items' },
  { label: 'Outcome', width: COLUMN_WIDTH.outcome },
  { label: 'Finished', width: COLUMN_WIDTH.time },
]

export function FinishedTable({ orders, loading }: { orders: Order[] | null; loading: boolean }) {
  return (
    <OrdersTableShell
      label="Finished orders"
      columns={COLUMNS}
      loading={loading}
      isEmpty={orders?.length === 0}
      emptyMessage={EMPTY_MESSAGE.finished}
    >
      {orders?.map((order) => (
        <TableRow key={order.id} sx={rowSx}>
          <TableCell>
            <OrderCell order={order} />
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
            <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
          </TableCell>
          <TableCell>
            <Tooltip title={`${formatDuration(order.minutes_in_status)} ago`} placement="top">
              <Typography variant="body2" sx={{ ...numeric, width: 'fit-content' }}>
                {formatTime(order.status_changed_at)}
              </Typography>
            </Tooltip>
          </TableCell>
        </TableRow>
      ))}
    </OrdersTableShell>
  )
}
