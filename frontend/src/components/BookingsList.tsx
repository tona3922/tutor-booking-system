import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import type { Booking } from '../api'
import { bookingApi } from '../api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookingDetailDialog } from './BookingDetailDialog'
import { STATUS_LABEL, statusVariant } from '../lib/booking-status'

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Booking | null>(null)

  const load = () => {
    bookingApi
      .listMine()
      .then(setBookings)
      .catch((err) => setError((err as Error).message))
  }

  useEffect(load, [])

  const handleCancel = async (e: MouseEvent, id: number) => {
    e.stopPropagation()
    await bookingApi.cancel(id)
    load()
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
              <TableCell>{new Date(b.startTime).toLocaleString()}</TableCell>
              <TableCell>{new Date(b.endTime).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(b.status)}>{STATUS_LABEL[b.status]}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                  <Button type="button" size="sm" variant="outline" onClick={(e) => handleCancel(e, b.id)}>
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {bookings.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No bookings yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <BookingDetailDialog
        booking={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onCancelled={load}
        onStatusChanged={load}
      />
    </div>
  )
}
