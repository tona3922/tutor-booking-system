import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Dealership, DealershipAvailability, ServiceBayAvailability, TechnicianAvailability } from '../api'
import { dealershipApi, serviceBayApi, technicianApi } from '../api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, X } from 'lucide-react'

interface BookPrefill {
  startTime: string
  endTime: string
  bayId?: number
  technicianId?: number
}

interface Props {
  onBook: (dealership: Dealership, prefill: BookPrefill) => void
}

function isDealershipAvailability(d: Dealership | DealershipAvailability): d is DealershipAvailability {
  return 'availableBayCount' in d
}

// The backend stores booking times as zoneless wall-clock values (LocalDateTime), so we
// pass the <input type="datetime-local"> value straight through instead of routing it
// through Date/toISOString — that would silently reinterpret it via the browser's local
// timezone and desync it from what the user actually picked once it round-trips.
function toIso(datetimeLocal: string): string {
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal
}

const DEBOUNCE_MS = 300

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return [...byId.values()]
}

function AvailabilityTag({ available }: { available: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`size-2 shrink-0 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      <span className={available ? 'text-foreground' : 'text-destructive'}>
        {available ? 'Available' : 'Unavailable'}
      </span>
    </span>
  )
}

export function SearchDashboard({ onBook }: Props) {
  const [allDealerships, setAllDealerships] = useState<Dealership[]>([])
  const [query, setQuery] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const [dealerships, setDealerships] = useState<(Dealership | DealershipAvailability)[]>([])
  const [technicians, setTechnicians] = useState<TechnicianAvailability[]>([])
  const [bays, setBays] = useState<ServiceBayAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dealershipApi.list().then(setAllDealerships).catch(() => undefined)
  }, [])

  // Live search: fetch the default (unfiltered) lists on mount, then re-fetch as the
  // query text or optional time window changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      const hasWindow = Boolean(startTime && endTime)
      const window = hasWindow ? { startTime: toIso(startTime), endTime: toIso(endTime) } : undefined
      const name = query.trim() || undefined

      const run = async () => {
        const dealershipResult = window
          ? await dealershipApi.searchAvailability({ name, ...window })
          : await dealershipApi.list().then((list) =>
              name
                ? list.filter(
                    (d) =>
                      d.name.toLowerCase().includes(name.toLowerCase()) ||
                      d.address.toLowerCase().includes(name.toLowerCase())
                  )
                : list
            )

        const [nameTechResult, nameBayResult] = await Promise.all([
          technicianApi.searchAvailability({ name, ...window }),
          serviceBayApi.searchAvailability({ bayNumber: name, ...window }),
        ])

        if (!name) {
          return { dealershipResult, technicianResult: nameTechResult, bayResult: nameBayResult }
        }

        // A query that only matches a dealership's name/address should still surface that
        // dealership's technicians and bays, even though their own name/bayNumber don't
        // contain the query text.
        const dealershipIds = dealershipResult.map((d) => d.id)
        const [byDealershipTechResults, byDealershipBayResults] = await Promise.all([
          Promise.all(dealershipIds.map((dealershipId) => technicianApi.searchAvailability({ dealershipId, ...window }))),
          Promise.all(dealershipIds.map((dealershipId) => serviceBayApi.searchAvailability({ dealershipId, ...window }))),
        ])

        return {
          dealershipResult,
          technicianResult: dedupeById([...nameTechResult, ...byDealershipTechResults.flat()]),
          bayResult: dedupeById([...nameBayResult, ...byDealershipBayResults.flat()]),
        }
      }

      run()
        .then(({ dealershipResult, technicianResult, bayResult }) => {
          if (cancelled) return
          setTechnicians(technicianResult)
          setBays(bayResult)
          setDealerships(dealershipResult)
        })
        .catch((err) => {
          if (!cancelled) setError((err as Error).message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, startTime, endTime])

  const dealershipById = (id: number) => allDealerships.find((d) => d.id === id)

  const hasFilters = Boolean(query || startTime || endTime)
  const clearFilters = () => {
    setQuery('')
    setStartTime('')
    setEndTime('')
  }

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-2xl space-y-3">
        <h2 className="text-center text-xl font-medium">Search availability</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dealerships, technicians, or service bays..."
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Start time (optional)</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">End time (optional)</Label>
            <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" disabled={!hasFilters} onClick={clearFilters}>
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ResultSection title="Dealerships" loading={loading} empty={dealerships.length === 0}>
        {dealerships.map((d) => (
          <Card key={d.id} className="h-full justify-between">
            <CardHeader>
              <CardTitle className="text-base">{d.name}</CardTitle>
              <CardDescription>{d.address}</CardDescription>
            </CardHeader>
            {isDealershipAvailability(d) && (
              <CardContent>
                <Badge variant={d.availableBayCount > 0 ? 'default' : 'outline'}>
                  {d.availableBayCount} bay{d.availableBayCount === 1 ? '' : 's'} · {d.availableTechnicianCount} tech
                  {d.availableTechnicianCount === 1 ? '' : 's'}
                </Badge>
              </CardContent>
            )}
            <CardFooter>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={isDealershipAvailability(d) && d.availableBayCount === 0}
                onClick={() => onBook(d, { startTime, endTime })}
              >
                Book here
              </Button>
            </CardFooter>
          </Card>
        ))}
      </ResultSection>

      <ResultSection title="Technicians" loading={loading} empty={technicians.length === 0}>
        {technicians.map((t) => {
          const dealership = dealershipById(t.dealershipId)
          return (
            <Card key={t.id} className="h-full justify-between">
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription>{t.skill}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-sm text-muted-foreground">{dealership?.name ?? 'Unknown dealership'}</p>
                <AvailabilityTag available={t.available} />
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!dealership || !t.available}
                  onClick={() => dealership && onBook(dealership, { startTime, endTime, technicianId: t.id })}
                >
                  Book with them
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </ResultSection>

      <ResultSection title="Service bays" loading={loading} empty={bays.length === 0}>
        {bays.map((b) => {
          const dealership = dealershipById(b.dealershipId)
          return (
            <Card key={b.id} className="h-full justify-between">
              <CardHeader>
                <CardTitle className="text-base">Bay {b.bayNumber}</CardTitle>
                <CardDescription>{dealership?.name ?? 'Unknown dealership'}</CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilityTag available={b.available} />
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!dealership || !b.available}
                  onClick={() => dealership && onBook(dealership, { startTime, endTime, bayId: b.id })}
                >
                  Book this bay
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </ResultSection>
    </div>
  )
}

function ResultSection({
  title,
  loading,
  empty,
  children,
}: {
  title: string
  loading: boolean
  empty: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">No results.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
      )}
    </div>
  )
}
