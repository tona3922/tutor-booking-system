import { useState } from 'react'
import type { Booking, Customer, Dealership, Vehicle } from '../api'
import { bookingApi } from '../api'
import type { BookingDetails } from './BookingDetailsStep'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props {
  dealership: Dealership
  details: BookingDetails
  customer: Customer
  vehicle: Vehicle
  onComplete: (customer: Customer, booking: Booking) => void
  onBack: () => void
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function ReviewStep({ dealership, details, customer, vehicle, onComplete, onBack }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const booking = await bookingApi.create({
        vehicleId: vehicle.id,
        dealershipId: dealership.id,
        serviceBayId: details.bay.id,
        startTime: details.startTime,
        endTime: details.endTime,
      })
      await Promise.all(
        details.technicians.map((technician) =>
          bookingApi.assignTechnician(booking.id, technician.id, technician.skill),
        ),
      )
      onComplete(customer, booking)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Review your appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y">
          <SummaryRow label="Dealership" value={`${dealership.name} — ${dealership.address}`} />
          <SummaryRow
            label="When"
            value={`${new Date(details.startTime).toLocaleString()} – ${new Date(details.endTime).toLocaleString()}`}
          />
          <SummaryRow label="Service bay" value={`Bay ${details.bay.bayNumber}`} />
          <SummaryRow
            label="Technicians"
            value={
              details.technicians.length > 0
                ? details.technicians.map((t) => `${t.name} (${t.skill})`).join(', ')
                : 'No preference'
            }
          />
          <SummaryRow label="Customer" value={`${customer.name} — ${customer.email}`} />
          <SummaryRow label="Vehicle" value={`${vehicle.year} ${vehicle.brand} ${vehicle.model} — ${vehicle.plateNumber}`} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Separator />

        <div className="space-y-2">
          <Button type="button" onClick={handleConfirm} disabled={submitting} className="w-full">
            {submitting ? 'Booking...' : 'Confirm booking'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
