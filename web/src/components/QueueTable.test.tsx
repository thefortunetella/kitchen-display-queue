import { ThemeProvider } from '@mui/material'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Order } from '../api/orders'
import { buildOrder } from '../test/buildOrder'
import { theme } from '../theme'
import { QueueTable } from './QueueTable'

function renderQueue(orders: Order[] | null, onAction = vi.fn()) {
  render(
    <ThemeProvider theme={theme}>
      <QueueTable orders={orders} filter="active" loading={false} pendingOrderId={null} onAction={onAction} />
    </ThemeProvider>,
  )
  return { onAction }
}

const rowOf = (customer: string) => screen.getByText(customer).closest('tr') as HTMLElement

describe('QueueTable', () => {
  it('offers Cancel only on the order whose allowed actions include it', () => {
    renderQueue([
      buildOrder({ id: 1, customer_name: 'Ben Carter', status: 'preparing', allowed_actions: ['ready'] }),
      buildOrder({ id: 2, customer_name: 'Alice Martin', status: 'received', allowed_actions: ['start', 'cancel'] }),
    ])

    const preparing = within(rowOf('Ben Carter'))
    expect(preparing.getByRole('button', { name: 'Mark ready: order 1' })).toBeInTheDocument()
    expect(preparing.queryByRole('button', { name: /Cancel order/ })).not.toBeInTheDocument()

    const received = within(rowOf('Alice Martin'))
    expect(received.getByRole('button', { name: 'Start preparing: order 2' })).toBeInTheDocument()
    expect(received.getByRole('button', { name: 'Cancel order: order 2' })).toBeInTheDocument()
  })

  it('reports the clicked action with its order', async () => {
    const order = buildOrder({ id: 7 })
    const { onAction } = renderQueue([order])

    await userEvent.click(screen.getByRole('button', { name: 'Start preparing: order 7' }))

    expect(onAction).toHaveBeenCalledWith(order, 'start')
  })

  it('marks the highest-ranked order that can be started as Next up', () => {
    renderQueue([
      buildOrder({ id: 1, customer_name: 'Ben Carter', status: 'preparing', allowed_actions: ['ready'] }),
      buildOrder({ id: 2, customer_name: 'Alice Martin' }),
      buildOrder({ id: 3, customer_name: 'Chloe Davis' }),
    ])

    expect(screen.getAllByText('Next up')).toHaveLength(1)
    expect(within(rowOf('Alice Martin')).getByText('Next up')).toBeInTheDocument()
  })

  it('shows the empty state when there are no orders', () => {
    renderQueue([])

    expect(screen.getByText('No active orders. The kitchen is clear.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
