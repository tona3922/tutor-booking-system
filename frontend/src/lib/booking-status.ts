import type { Booking } from '../api'

// Customer-facing label for each backend status -- COMPLETED reads as "Finished" in the UI.
export const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Finished',
  CANCELLED: 'Cancelled',
}

export function statusVariant(status: Booking['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'CANCELLED':
      return 'destructive'
    case 'COMPLETED':
      return 'secondary'
    case 'CONFIRMED':
    case 'IN_PROGRESS':
      return 'default'
    default:
      return 'outline'
  }
}
