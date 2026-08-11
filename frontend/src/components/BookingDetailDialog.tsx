import { useEffect, useState } from 'react'
import type { Booking, BookingTechnician, Dealership, ServiceBay, Technician, Vehicle } from '../api'
import { bookingApi, dealershipApi, serviceBayApi, technicianApi, vehicleApi } from '../api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { STATUS_LABEL, statusVariant } from '../lib/booking-status'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

interface AssignedTechnician extends BookingTechnician {
  technician?: Technician
}

interface Details {
  dealership: Dealership
  bay: ServiceBay
  vehicle: Vehicle
  technicians: AssignedTechnician[]
}

// Customers can only confirm or cancel their own booking -- starting service and marking
// it finished are shop-staff actions, done elsewhere, not exposed in this customer-facing UI.
const NEXT_STATUS: Partial<Record<Booking['status'], { status: Booking['status']; label: string }>> = {
  PENDING: { status: 'CONFIRMED', label: 'Confirm booking' },
}

interface Props {
  booking: Booking | null
  onOpenChange: (open: boolean) => void
  onCancelled: () => void
  onStatusChanged: () => void
}

export function BookingDetailDialog({ booking, onOpenChange, onCancelled, onStatusChanged }: Props) {
  const [details, setDetails] = useState<Details | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    setDetails(null)
    setError(null)
    if (!booking) return

    let cancelled = false
    setLoading(true)

    Promise.all([
      dealershipApi.get(booking.dealershipId),
      serviceBayApi.get(booking.serviceBayId),
      vehicleApi.get(booking.vehicleId),
      bookingApi.listTechnicians(booking.id),
    ])
      .then(async ([dealership, bay, vehicle, assignments]) => {
        const technicians = await Promise.all(
          assignments.map(async (assignment) => ({
            ...assignment,
            technician: await technicianApi.get(assignment.technicianId).catch(() => undefined),
          }))
        )
        if (!cancelled) setDetails({ dealership, bay, vehicle, technicians })
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [booking])

  const handleCancel = async () => {
    if (!booking) return
    setCancelling(true)
    setError(null)
    try {
      await bookingApi.cancel(booking.id)
      onCancelled()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  const handleAdvanceStatus = async () => {
    if (!booking) return
    const next = NEXT_STATUS[booking.status]
    if (!next) return
    setAdvancing(true)
    setError(null)
    try {
      await bookingApi.updateStatus(booking.id, next.status)
      onStatusChanged()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAdvancing(false)
    }
  }

  const cancellable = booking && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED'
  const nextStatus = booking ? NEXT_STATUS[booking.status] : undefined

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking details</DialogTitle>
          {booking && (
            <DialogDescription asChild>
              <Badge variant={statusVariant(booking.status)}>{STATUS_LABEL[booking.status]}</Badge>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {booking && details && !loading && (
          <div className="divide-y">
            <DetailRow
              label="When"
              value={`${new Date(booking.startTime).toLocaleString()} – ${new Date(booking.endTime).toLocaleString()}`}
            />
            <DetailRow label="Dealership" value={`${details.dealership.name} — ${details.dealership.address}`} />
            <DetailRow label="Service bay" value={`Bay ${details.bay.bayNumber}`} />
            <DetailRow
              label="Vehicle"
              value={`${details.vehicle.year} ${details.vehicle.brand} ${details.vehicle.model} — ${details.vehicle.plateNumber}`}
            />
            <DetailRow
              label="Technician(s)"
              value={
                details.technicians.length
                  ? details.technicians
                      .map((t) => (t.technician ? `${t.technician.name} (${t.role})` : `#${t.technicianId}`))
                      .join(', ')
                  : 'No preference'
              }
            />
            <DetailRow label="Booked on" value={new Date(booking.createdAt).toLocaleString()} />
          </div>
        )}

        <DialogFooter>
          {cancellable && (
            <Button type="button" variant="outline" disabled={cancelling || advancing} onClick={handleCancel}>
              {cancelling ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          )}
          {nextStatus && (
            <Button type="button" disabled={cancelling || advancing} onClick={handleAdvanceStatus}>
              {advancing ? 'Updating...' : nextStatus.label}
            </Button>
          )}
          <Button type="button" variant={nextStatus ? 'ghost' : 'default'} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
