import type { ReactNode } from 'react'
import {
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { pinnedRight } from './tableStyles'

export interface Column {
  label: string
  width?: number
  help?: string
}

interface OrdersTableShellProps {
  label: string
  columns: Column[]
  pinLastColumn?: boolean
  loading: boolean
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}

export function OrdersTableShell({
  label,
  columns,
  pinLastColumn = false,
  loading,
  isEmpty,
  emptyMessage,
  children,
}: OrdersTableShellProps) {
  return (
    <TableContainer sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <LinearProgress sx={{ visibility: loading ? 'visible' : 'hidden', height: 2 }} aria-hidden={!loading} />
      <Table size="small" stickyHeader aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell
                key={column.label}
                sx={{
                  width: column.width,
                  ...(pinLastColumn && index === columns.length - 1 && { ...pinnedRight, bgcolor: undefined, zIndex: 3 }),
                }}
              >
                {column.help ? (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <span>{column.label}</span>
                    <Tooltip title={column.help}>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} aria-label={column.help} />
                    </Tooltip>
                  </Stack>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {isEmpty && (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          )}
          {children}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
