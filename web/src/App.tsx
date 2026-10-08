import { useState } from 'react'
import { Alert, AlertTitle, Box, Button, Paper, Snackbar, Stack } from '@mui/material'
import { FINISHED_PATH, queuePath, READY_PATH, toApiError, transitionOrder } from './api/orders'
import type { ApiError, Order, OrderAction } from './api/orders'
import { AppHeader } from './components/AppHeader'
import { ConfirmCancelDialog } from './components/ConfirmCancelDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FinishedTable } from './components/FinishedTable'
import { QueueTable } from './components/QueueTable'
import { ReadyTable } from './components/ReadyTable'
import { StatusPipeline } from './components/StatusPipeline'
import { actionLabel, describeNewStatus } from './format'
import type { View } from './format'
import { useAutoRefresh } from './hooks/useAutoRefresh'
import { useOrders } from './hooks/useOrders'

const AUTO_REFRESH_SECONDS = 15

interface ActionFailure {
  error: ApiError
  description: string
}

export default function App() {
  const [view, setView] = useState<View>('active')
  const { tick, refresh } = useAutoRefresh(AUTO_REFRESH_SECONDS * 1000)

  // Active and ready lists always load (they feed the counts); the others only while shown.
  const active = useOrders(queuePath('active'), tick)
  const isQueueView = view === 'active' || view === 'received' || view === 'preparing'
  const filtered = useOrders(view === 'received' || view === 'preparing' ? queuePath(view) : null, tick)
  const ready = useOrders(READY_PATH, tick)
  const finished = useOrders(view === 'finished' ? FINISHED_PATH : null, tick)
  const current = view === 'active' ? active : isQueueView ? filtered : view === 'ready' ? ready : finished

  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)
  const [actionFailure, setActionFailure] = useState<ActionFailure | null>(null)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function runAction(order: Order, action: OrderAction) {
    setPendingOrderId(order.id)
    setActionFailure(null)
    try {
      const { order: updated } = await transitionOrder(order.id, action)
      setNotice(describeNewStatus(updated.id, updated.status))
    } catch (err) {
      setActionFailure({
        error: toApiError(err),
        description: `"${actionLabel(action)}" on order #${order.id} (${order.customer_name})`,
      })
    } finally {
      setPendingOrderId(null)
      // Also after a rejection, so the row shows the current status.
      refresh()
    }
  }

  function handleAction(order: Order, action: OrderAction) {
    if (action === 'cancel') {
      setOrderToCancel(order)
      setConfirmOpen(true)
    } else {
      void runAction(order, action)
    }
  }

  const activeOrders = active.orders
  const counts: Partial<Record<View, number>> = activeOrders
    ? {
        active: activeOrders.length,
        received: activeOrders.filter((o) => o.status === 'received').length,
        preparing: activeOrders.filter((o) => o.status === 'preparing').length,
        ...(ready.orders && { ready: ready.orders.length }),
      }
    : {}
  const lateOrderIds = [...(activeOrders ?? []), ...(ready.orders ?? [])]
    .filter((o) => o.minutes_until_promised !== null && o.minutes_until_promised < 0)
    .map((o) => o.id)

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppHeader
        generatedAt={active.generatedAt}
        refreshing={active.loading || current.loading}
        offline={active.error !== null}
        autoRefreshSeconds={AUTO_REFRESH_SECONDS}
        onRefresh={refresh}
      />

      <Box
        component="main"
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2, px: 3, py: 2.5 }}
      >
        <StatusPipeline value={view} counts={counts} lateOrderIds={lateOrderIds} onChange={setView} />

        <Paper
          variant="outlined"
          sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 3 }}
        >
          {(actionFailure || current.error) && (
            <Stack spacing={1} sx={{ p: 2, pb: 0 }}>
              {actionFailure && (
                <Alert severity="error" onClose={() => setActionFailure(null)}>
                  <AlertTitle>{actionFailure.description} was rejected</AlertTitle>
                  {actionFailure.error.message} <code>{actionFailure.error.code}</code>
                </Alert>
              )}
              {current.error && (
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={refresh}>
                      Retry
                    </Button>
                  }
                >
                  <AlertTitle>Could not load this list</AlertTitle>
                  {current.error.message} <code>{current.error.code}</code>
                </Alert>
              )}
            </Stack>
          )}

          <ErrorBoundary key={view}>
          {isQueueView && (
            <QueueTable
              orders={current.orders}
              filter={view}
              loading={current.loading}
              pendingOrderId={pendingOrderId}
              onAction={handleAction}
            />
          )}
          {view === 'ready' && (
            <ReadyTable orders={ready.orders} loading={ready.loading} pendingOrderId={pendingOrderId} onAction={handleAction} />
          )}
          {view === 'finished' && <FinishedTable orders={finished.orders} loading={finished.loading} />}
          </ErrorBoundary>
        </Paper>
      </Box>

      <ConfirmCancelDialog
        open={confirmOpen}
        order={orderToCancel}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(order) => {
          setConfirmOpen(false)
          void runAction(order, 'cancel')
        }}
      />

      <Snackbar
        open={notice !== null}
        message={notice}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  )
}
