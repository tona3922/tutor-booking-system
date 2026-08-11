import { useMemo, useState } from 'react'
import type { Lesson, Room, Tutor } from '../api'
import { ApiError, lessonApi } from '../api'
import { addMinutesToTime, formatTime, generateTimeSlots, timeRangesOverlap } from '../lib/time'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  lesson: Lesson
  tutors: Tutor[]
  rooms: Room[]
  lessons: Lesson[]
  onSaved: () => void
}

const OCCUPYING: Lesson['status'][] = ['BOOKED', 'NO_SHOW']
const MAX_BOOKINGS_PER_TUTOR_PER_DAY = 6
const TIME_SLOTS = generateTimeSlots(8 * 60, 21 * 60 + 30, 30)

export function EditLessonForm({ lesson, tutors, rooms, lessons, onSaved }: Props) {
  const [tutorId, setTutorId] = useState(String(lesson.tutorId))
  const [roomId, setRoomId] = useState(String(lesson.roomId))
  const [startTime, setStartTime] = useState(formatTime(lesson.startTime))
  const [durationMin, setDurationMin] = useState(String(lesson.durationMin))
  const [conflictMessages, setConflictMessages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Excludes the lesson being edited so it never conflicts with its own current slot.
  const otherLessons = useMemo(
    () => lessons.filter((l) => l.id !== lesson.id),
    [lessons, lesson.id],
  )

  const tutorLoad = useMemo(() => {
    const counts = new Map<number, number>()
    for (const l of otherLessons) {
      if (!OCCUPYING.includes(l.status)) continue
      counts.set(l.tutorId, (counts.get(l.tutorId) ?? 0) + 1)
    }
    return counts
  }, [otherLessons])

  const bookedSlots = useMemo(() => {
    const roomIdNum = Number(roomId)
    const tutorIdNum = Number(tutorId)
    const duration = Number(durationMin)
    const disabled = new Set<string>()
    for (const slot of TIME_SLOTS) {
      const overlapsExisting = otherLessons.some(
        (l) =>
          OCCUPYING.includes(l.status) &&
          ((roomId !== '' && l.roomId === roomIdNum) || (tutorId !== '' && l.tutorId === tutorIdNum)) &&
          timeRangesOverlap(slot, duration, l.startTime, l.durationMin),
      )
      if (overlapsExisting) disabled.add(slot)
    }
    return disabled
  }, [otherLessons, roomId, tutorId, durationMin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tutorId || !roomId) return
    setConflictMessages([])

    const duration = Number(durationMin)
    const overlapping = otherLessons.filter(
      (l) =>
        OCCUPYING.includes(l.status) &&
        (l.roomId === Number(roomId) || l.tutorId === Number(tutorId)) &&
        timeRangesOverlap(startTime, duration, l.startTime, l.durationMin),
    )
    if (overlapping.length > 0) {
      setConflictMessages(
        overlapping.map((l) => {
          const resource = l.roomId === Number(roomId) ? 'Room' : 'Tutor'
          const end = addMinutesToTime(l.startTime, l.durationMin)
          return `${resource} already booked ${formatTime(l.startTime)}–${formatTime(end)}`
        }),
      )
      return
    }

    setSubmitting(true)
    try {
      await lessonApi.reschedule(lesson.id, {
        date: lesson.date,
        startTime,
        durationMin: duration,
        tutorId: Number(tutorId),
        roomId: Number(roomId),
        note: lesson.note ?? undefined,
      })
      onSaved()
    } catch (err) {
      if (err instanceof ApiError && err.conflicts?.length) {
        setConflictMessages(err.conflicts.map((c) => c.message))
      } else if (err instanceof Error) {
        setConflictMessages([err.message])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit lesson</DialogTitle>
        <DialogDescription>
          Moving {lesson.student}'s lesson on {lesson.date}. Conflicts are checked before saving.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tutor</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select tutor" /></SelectTrigger>
              <SelectContent>
                {tutors.map((t) => {
                  const load = tutorLoad.get(t.id) ?? 0
                  const full = load >= MAX_BOOKINGS_PER_TUTOR_PER_DAY
                  return (
                    <SelectItem key={t.id} value={String(t.id)} disabled={full}>
                      {t.name} ({t.subject}){full ? ' — full for this day' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Start time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => {
                  const disabled = bookedSlots.has(slot)
                  return (
                    <SelectItem key={slot} value={slot} disabled={disabled}>
                      {slot}{disabled ? ' — booked' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Duration</Label>
            <Select value={durationMin} onValueChange={setDurationMin}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {conflictMessages.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
            {conflictMessages.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
