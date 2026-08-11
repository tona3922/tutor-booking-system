export function formatTime(time: string): string {
  return time.slice(0, 5)
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function addMinutesToTime(time: string, minutes: number): string {
  const total = toMinutes(time) + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isMonday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 1
}

export function generateTimeSlots(startMinutes: number, endMinutes: number, stepMinutes: number): string[] {
  const slots: string[] = []
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return slots
}

export function timeRangesOverlap(
  aStart: string,
  aDurationMin: number,
  bStart: string,
  bDurationMin: number,
): boolean {
  const aStartMin = toMinutes(aStart)
  const aEndMin = aStartMin + aDurationMin
  const bStartMin = toMinutes(bStart)
  const bEndMin = bStartMin + bDurationMin
  return aStartMin < bEndMin && bStartMin < aEndMin
}
