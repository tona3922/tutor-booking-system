import type { Customer } from '../api'
import { BookingsList } from '../components/BookingsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  customer: Customer
  onLogout: () => void
}

export function MyBookingsStep({ customer, onLogout }: Props) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Your bookings</CardTitle>
        <CardDescription>
          Signed in as {customer.name} ({customer.email})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BookingsList />
        <Button type="button" variant="ghost" onClick={onLogout}>
          Log out
        </Button>
      </CardContent>
    </Card>
  )
}
