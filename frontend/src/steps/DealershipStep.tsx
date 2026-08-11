import { useEffect, useState } from 'react'
import type { Dealership } from '../api'
import { dealershipApi } from '../api'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  onComplete: (dealership: Dealership) => void
}

export function DealershipStep({ onComplete }: Props) {
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dealershipApi
      .list()
      .then(setDealerships)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-xl font-medium">Choose a dealership</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading dealerships...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dealerships.map((d) => (
            <Card
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => onComplete(d)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onComplete(d)
              }}
              className="cursor-pointer transition hover:ring-2 hover:ring-primary"
            >
              <CardHeader>
                <CardTitle>{d.name}</CardTitle>
                <CardDescription>{d.address}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {!loading && dealerships.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No dealerships available yet.</p>
      )}
    </div>
  )
}
