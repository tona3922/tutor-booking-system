import { useState } from 'react'
import type { Room, Tutor } from '../api'
import { ApiError, lessonApi } from '../api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  tutors: Tutor[]
  rooms: Room[]
  onCreated: () => void
}

export function AddLessonDialog({ open, onOpenChange, date, tutors, rooms, onCreated }: Props) {
  const [student, setStudent] = useState('')
  const [tutorId, setTutorId] = useState<string>('')
  const [roomId, setRoomId] = useState<string>('')
  const [startTime, setStartTime] = useState('09:00')
  const [durationMin, setDurationMin] = useState<string>('60')
  const [note, setNote] = useState('')
  const [conflictMessages, setConflictMessages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setStudent('')
    setTutorId('')
    setRoomId('')
    setStartTime('09:00')
    setDurationMin('60')
    setNote('')
    setConflictMessages([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student.trim() || !tutorId || !roomId) return
    setSubmitting(true)
    setConflictMessages([])
    try {
      await lessonApi.create({
        date,
        startTime,
        durationMin: Number(durationMin),
        student: student.trim(),
        tutorId: Number(tutorId),
        roomId: Number(roomId),
        note: note.trim() || undefined,
      })
      reset()
      onOpenChange(false)
      onCreated()
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
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add lesson</DialogTitle>
          <DialogDescription>Scheduling for {date}. Conflicts are checked before the lesson is saved.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student">Student</Label>
            <Input id="student" value={student} onChange={(e) => setStudent(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tutor</Label>
              <Select value={tutorId} onValueChange={setTutorId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select tutor" /></SelectTrigger>
                <SelectContent>
                  {tutors.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.subject})</SelectItem>
                  ))}
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
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
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
              {submitting ? 'Checking...' : 'Add lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
