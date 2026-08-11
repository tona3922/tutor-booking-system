import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Vehicle } from '../api'
import { vehicleApi } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  onComplete: (vehicle: Vehicle) => void
  onBack: () => void
}

export function VehicleStep({ onComplete, onBack }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [plateNumber, setPlateNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')

  useEffect(() => {
    vehicleApi
      .listMine()
      .then((list) => {
        setVehicles(list)
        setAdding(list.length === 0)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const vehicle = await vehicleApi.create({
        plateNumber,
        brand,
        model,
        year: Number(year),
      })
      onComplete(vehicle)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (loading) return <p className="text-center text-sm text-muted-foreground">Loading your vehicles...</p>

  if (!adding) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Which vehicle?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {vehicles.map((v) => (
              <Button
                key={v.id}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start py-2.5"
                onClick={() => onComplete(v)}
              >
                {v.year} {v.brand} {v.model} — {v.plateNumber}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => setAdding(true)}>
              + Add a different vehicle
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Add your vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plateNumber">Plate number</Label>
            <Input id="plateNumber" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Button type="submit" className="w-full">
              Continue
            </Button>
            {vehicles.length > 0 && (
              <Button type="button" variant="link" className="w-full" onClick={() => setAdding(false)}>
                Choose an existing vehicle instead
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
