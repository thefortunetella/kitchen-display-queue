import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import type { Order } from '../api/orders'
import { formatItems } from '../format'

interface ConfirmCancelDialogProps {
  open: boolean
  // Separate from `open` so the content stays during the closing transition.
  order: Order | null
  onConfirm: (order: Order) => void
  onClose: () => void
}

// Cancelling is irreversible, so it is the only action that asks for confirmation.
export function ConfirmCancelDialog({ open, order, onConfirm, onClose }: ConfirmCancelDialogProps) {
  return (
    <Dialog open={open && order !== null} onClose={onClose} aria-labelledby="confirm-cancel-title">
      {order && (
        <>
          <DialogTitle id="confirm-cancel-title">
            Cancel order #{order.id} ({order.customer_name})?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {formatItems(order.items)}. A cancelled order cannot be reopened.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} autoFocus>
              Keep order
            </Button>
            <Button color="error" variant="contained" onClick={() => onConfirm(order)}>
              Cancel order
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
