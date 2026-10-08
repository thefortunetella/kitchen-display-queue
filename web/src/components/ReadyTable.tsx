import { TableCell, TableRow } from '@mui/material'
import type { Order, OrderAction } from '../api/orders'
import { EMPTY_MESSAGE, formatTime } from '../format'
import { DurationCell, ItemsCell, OrderCell, PromisedCell, TypeCell, VipCell } from './cells'
import { OrderActions } from './OrderActions'
import { OrdersTableShell } from './OrdersTableShell'
import type { Column } from './OrdersTableShell'
import { COLUMN_WIDTH, pinnedRight, rowSx } from './tableStyles'

const COLUMNS: Column[] = [
  { label: 'Customer', width: COLUMN_WIDTH.order },
  { label: 'VIP', width: COLUMN_WIDTH.vip },
  { label: 'Type', width: COLUMN_WIDTH.type },
  { label: 'Items' },
  { label: 'Ready for', width: COLUMN_WIDTH.time, help: 'Time since the kitchen marked the order ready.' },
  { label: 'Promised', width: COLUMN_WIDTH.promised },
  { label: 'Next step', width: COLUMN_WIDTH.actions },
]

interface ReadyTableProps {
  orders: Order[] | null
  loading: boolean
  pendingOrderId: number | null
  onAction: (order: Order, action: OrderAction) => void
}

export function ReadyTable({ orders, loading, pendingOrderId, onAction }: ReadyTableProps) {
  return (
    <OrdersTableShell
      label="Ready orders"
      columns={COLUMNS}
      pinLastColumn
      loading={loading}
      isEmpty={orders?.length === 0}
      emptyMessage={EMPTY_MESSAGE.ready}
    >
      {orders?.map((order, index) => (
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
            <DurationCell minutes={order.minutes_in_status} detail={`Ready at ${formatTime(order.status_changed_at)}`} />
          </TableCell>
          <TableCell>
            <PromisedCell order={order} />
          </TableCell>
          <TableCell sx={pinnedRight}>
            <OrderActions order={order} disabled={pendingOrderId === order.id} emphasized={index === 0} onAction={onAction} />
          </TableCell>
        </TableRow>
      ))}
    </OrdersTableShell>
  )
}
