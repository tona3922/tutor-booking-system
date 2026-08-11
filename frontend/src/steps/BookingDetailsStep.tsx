import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Dealership, ServiceBay, Technician } from '../api'
import { serviceBayApi, technicianApi } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface BookingDetails {
  bay: ServiceBay
  technicians: Technician[]
  startTime: string
  endTime: string
}

interface Props {
  dealership: Dealership
  onComplete: (details: BookingDetails) => void
  onBack: () => void
  initialStartTime?: string
  initialEndTime?: string
  initialBayId?: number
  initialTechnicianId?: number
}

// The backend stores booking times as zoneless wall-clock values (LocalDateTime), so we
// pass the <input type="datetime-local"> value straight through instead of routing it
// through Date/toISOString — that would silently reinterpret it via the browser's local
// timezone and desync it from what the user actually picked once it round-trips.
function toIso(datetimeLocal: string): string {
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal
}

export function BookingDetailsStep({
  dealership,
  onComplete,
  onBack,
  initialStartTime,
  initialEndTime,
  initialBayId,
  initialTechnicianId,
}: Props) {
  const [bays, setBays] = useState<ServiceBay[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bayId, setBayId] = useState(initialBayId ? String(initialBayId) : '')
  const [technicianIds, setTechnicianIds] = useState<number[]>(
    initialTechnicianId ? [initialTechnicianId] : [],
  )
  const [startTime, setStartTime] = useState(initialStartTime ?? '')
  const [endTime, setEndTime] = useState(initialEndTime ?? '')

  // Re-check availability for this dealership whenever the chosen time window changes,
  // so the bay/technician options always reflect who's actually free at that time.
  useEffect(() => {
    setLoading(true)
    const window =
      startTime && endTime ? { startTime: toIso(startTime), endTime: toIso(endTime) } : {}

    Promise.all([
      serviceBayApi.search({ dealershipId: dealership.id, ...window }),
      technicianApi.search({ dealershipId: dealership.id, ...window }),
    ])
      .then(([bayList, techList]) => {
        setBays(window.startTime ? bayList : bayList.filter((b) => b.status === 'AVAILABLE'))
        const availableTechs = window.startTime ? techList : techList.filter((t) => t.status === 'AVAILABLE')
        setTechnicians(availableTechs)
        // Drop any previously selected technicians who are no longer available in this window.
        setTechnicianIds((ids) => ids.filter((id) => availableTechs.some((t) => t.id === id)))
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [dealership.id, startTime, endTime])

  const toggleTechnician = (id: number) => {
    setTechnicianIds((ids) => (ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const bay = bays.find((b) => b.id === Number(bayId))
    if (!bay) {
      setError('Please select a service bay.')
      return
    }
    const selectedTechnicians = technicians.filter((t) => technicianIds.includes(t.id))
    onComplete({ bay, technicians: selectedTechnicians, startTime: toIso(startTime), endTime: toIso(endTime) })
  }

  const hasTimeWindow = Boolean(startTime && endTime)

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Pick a time and bay</CardTitle>
        <CardDescription>{dealership.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endTime">End time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Service bay</Label>
            <Select value={bayId} onValueChange={setBayId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? 'Checking availability...' : 'Select a bay'} />
              </SelectTrigger>
              <SelectContent>
                {bays.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    Bay {b.bayNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Technicians (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Select any technicians available at this time — each can work on a different part of the vehicle.
            </p>
            {technicians.length > 0 ? (
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                {technicians.map((t) => {
                  const selected = technicianIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTechnician(t.id)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? 'border-primary bg-secondary text-secondary-foreground'
                          : 'border-border bg-background hover:bg-muted'
                      }`}
                    >
                      <span>
                        {t.name} — {t.skill}
                      </span>
                      {selected && <span className="text-xs font-medium">Selected</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {loading ? 'Checking availability...' : 'No technicians available for this time window.'}
              </p>
            )}
          </div>

          {!loading && bays.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {hasTimeWindow
                ? 'No service bays available at this dealership for that time window.'
                : 'No service bays available at this dealership right now.'}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Button type="submit" disabled={loading || bays.length === 0} className="w-full">
              Continue
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
