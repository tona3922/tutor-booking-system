import type { Booking } from '../api'
import { BookingsList } from '../components/BookingsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_LABEL } from '../lib/booking-status'

interface Props {
  booking: Booking
  onStartOver: () => void
}

export function ConfirmationStep({ booking, onStartOver }: Props) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Booking confirmed</CardTitle>
        <CardDescription>
          Booking #{booking.id} is <strong>{STATUS_LABEL[booking.status]}</strong> from{' '}
          {new Date(booking.startTime).toLocaleString()} to {new Date(booking.endTime).toLocaleString()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-sm font-medium">Your bookings</h3>
        <BookingsList />
        <Button type="button" onClick={onStartOver}>
          Book another appointment
        </Button>
      </CardContent>
    </Card>
  )
}
