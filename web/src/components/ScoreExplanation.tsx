import type { ReactElement } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import type { Order, ScoreBreakdown } from '../api/orders'
import { formatDuration, humanize, typeLabel } from '../format'

interface ScoreExplanationProps {
  order: Order
  position: number
  next: Order | undefined
  children: ReactElement
}

// Explains an order's position in words, from score_breakdown and ahead_of_next.
export function ScoreExplanation({ order, position, next, children }: ScoreExplanationProps) {
  return (
    <Tooltip
      title={<ExplanationCard order={order} position={position} next={next} />}
      placement="right-start"
      arrow={false}
      enterTouchDelay={0}
      leaveTouchDelay={8000}
      slotProps={{
        tooltip: {
          sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 6, border: 1, borderColor: 'divider', p: 0, maxWidth: 360 },
        },
      }}
    >
      {children}
    </Tooltip>
  )
}

// Lists the score parts that added points, without showing the points.
function reasonsFor(order: Order): string[] {
  const minutes = order.minutes_until_promised
  const known: Partial<Record<keyof ScoreBreakdown, string>> = {
    type: `${typeLabel(order.type)} order`,
    vip: 'VIP customer',
    wait: `Waiting for ${formatDuration(order.wait_minutes)}`,
    promise:
      minutes !== null && minutes < 0
        ? `Promised time passed ${formatDuration(-minutes)} ago`
        : `Promised in ${formatDuration(minutes ?? 0)}`,
    complexity: 'Preparation time of its dishes',
  }
  // Unknown parts fall back to their humanized name.
  return Object.entries(order.score_breakdown)
    .filter(([, points]) => points > 0)
    .map(([part]) => known[part as keyof ScoreBreakdown] ?? humanize(part))
}

const AHEAD_BECAUSE: Record<string, (next: Order) => string> = {
  promised_at: (next) => (next.promised_at === null ? 'it has a promised time and that one does not' : 'its promised time is earlier'),
  placed_at: () => 'it was placed earlier',
  id: () => 'its order number is lower',
}

function aheadSentence(order: Order, next: Order | undefined): string {
  const ahead = order.ahead_of_next
  if (!ahead || !next) return 'Last in this view: nothing is ranked below it.'
  const other = `#${next.id} ${next.customer_name}`
  if (ahead.decided_by === 'score') return `Higher priority than ${other}, the next order.`
  // Unknown tie-breaks get a generic sentence.
  const because = AHEAD_BECAUSE[ahead.decided_by]?.(next) ?? `of the queue's tie-break rule (${humanize(ahead.decided_by)})`
  return `Same priority as ${other}. Ahead because ${because}.`
}

function ExplanationCard({ order, position, next }: { order: Order; position: number; next: Order | undefined }) {
  return (
    <Box sx={{ p: 1.5, minWidth: 280 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
        Why order #{order.id} is number {position}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, mb: 0.5 }}>
        What raises its priority:
      </Typography>

      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {reasonsFor(order).map((reason) => (
          <li key={reason}>
            <Typography variant="body2">{reason}</Typography>
          </li>
        ))}
      </Box>

      <Typography variant="body2" sx={{ mt: 1.25, p: 1, borderRadius: 1, bgcolor: 'background.default' }}>
        {aheadSentence(order, next)}
      </Typography>
    </Box>
  )
}
