// Cells shared by the order tables. Secondary details are shown in tooltips.
import type { ReactNode } from 'react'
import { Box, Stack, Tooltip, Typography } from '@mui/material'
import DeliveryDiningOutlinedIcon from '@mui/icons-material/DeliveryDiningOutlined'
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import type { Order, OrderType } from '../api/orders'
import {
  formatDuration,
  formatItems,
  formatMinutesUntil,
  formatTime,
  typeHint,
  typeLabel,
} from '../format'
import { BADGE } from '../theme'
import { numeric, srOnly } from './tableStyles'

const ORDER_TYPE_ICON: Record<string, typeof RestaurantOutlinedIcon> = {
  dine_in: RestaurantOutlinedIcon,
  takeout: ShoppingBagOutlinedIcon,
  delivery: DeliveryDiningOutlinedIcon,
}

export function Badge({ tone, icon, children }: { tone: keyof typeof BADGE; icon?: ReactNode; children: ReactNode }) {
  const c = BADGE[tone] ?? BADGE.neutral
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        color: c.fg,
        bgcolor: c.bg,
        border: 1,
        borderColor: c.border,
      }}
    >
      {icon}
      {children}
    </Box>
  )
}

export function OrderCell({ order }: { order: Order }) {
  return (
    <Box sx={{ whiteSpace: 'nowrap' }}>
      <Typography component="span" sx={{ fontWeight: 700 }}>
        {order.customer_name}
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
        #{order.id}
      </Typography>
    </Box>
  )
}

export function VipCell({ isVip }: { isVip: boolean }) {
  if (!isVip) return <Box component="span" sx={srOnly}>Not VIP</Box>
  return (
    <Badge tone="vip" icon={<StarRoundedIcon sx={{ fontSize: 14 }} aria-hidden />}>
      VIP
    </Badge>
  )
}

export function TypeCell({ type }: { type: OrderType }) {
  const Icon = ORDER_TYPE_ICON[type] ?? ReceiptLongOutlinedIcon
  return (
    <Tooltip title={typeHint(type)} placement="top">
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ width: 'fit-content' }}>
        <Icon sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />
        <Typography variant="body2">{typeLabel(type)}</Typography>
      </Stack>
    </Tooltip>
  )
}

export function ItemsCell({ order }: { order: Order }) {
  return (
    <Tooltip
      placement="top-start"
      title={
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {order.items.map((item) => (
            <li key={item.menu_item_id}>
              {item.quantity}× {item.name}
            </li>
          ))}
        </Box>
      }
    >
      <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
        {formatItems(order.items)}
      </Typography>
    </Tooltip>
  )
}

export function DurationCell({ minutes, detail }: { minutes: number; detail: string }) {
  return (
    <Tooltip title={detail} placement="top">
      <Typography variant="body2" sx={{ ...numeric, width: 'fit-content' }}>
        {formatDuration(minutes)}
      </Typography>
    </Tooltip>
  )
}

export function PromisedCell({ order }: { order: Order }) {
  if (order.promised_at === null || order.minutes_until_promised === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        <span aria-hidden>—</span>
        <Box component="span" sx={srOnly}>
          No promised time
        </Box>
      </Typography>
    )
  }
  const late = order.minutes_until_promised < 0
  return (
    <Typography variant="body2" sx={numeric}>
      {formatTime(order.promised_at)}
      <Box component="span" sx={{ ml: 0.75, color: late ? 'error.main' : 'text.secondary', fontWeight: late ? 700 : 400 }}>
        · {formatMinutesUntil(order.minutes_until_promised)}
      </Box>
    </Typography>
  )
}
