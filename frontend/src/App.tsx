import { useEffect, useMemo, useState } from 'react'
import type { Conflict, Lesson, Room, Tutor } from './api'
import { ApiError, lessonApi, roomApi, tutorApi } from './api'
import { AddLessonDialog } from './components/AddLessonDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CONFLICT_LABEL, STATUS_LABEL, statusVariant } from './lib/lesson-status'

// Matches the backend's pinned NowProvider (service/.../time/NowProvider.java) -- the seed data
// only covers 2026-03-03 through 2026-03-10, so "today" is fixed to a date inside that week.
const PINNED_DATE = '2026-03-06'

function App() {
  const [date, setDate] = useState(PINNED_DATE)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([tutorApi.list(), roomApi.list()])
      .then(([t, r]) => {
        setTutors(t)
        setRooms(r)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  const loadSchedule = () => {
    setLoading(true)
    setError(null)
    Promise.all([lessonApi.listForDate(date), lessonApi.conflictsForDate(date)])
      .then(([l, c]) => {
        setLessons(l)
        setConflicts(c)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load schedule'))
      .finally(() => setLoading(false))
  }

  useEffect(loadSchedule, [date])

  const tutorName = useMemo(() => {
    const map = new Map(tutors.map((t) => [t.id, t.name]))
    return (id: number) => map.get(id) ?? `Tutor ${id}`
  }, [tutors])

  const roomLabel = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.id, r.label]))
    return (id: number) => map.get(id) ?? `Room ${id}`
  }, [rooms])

  const conflictsByLesson = useMemo(() => {
    const map = new Map<number, Conflict[]>()
    for (const conflict of conflicts) {
      for (const id of conflict.lessonIds) {
        map.set(id, [...(map.get(id) ?? []), conflict])
      }
    }
    return map
  }, [conflicts])

  const handleCancel = async (lessonId: number) => {
    setCancelling(lessonId)
    try {
      await lessonApi.cancel(lessonId)
      loadSchedule()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel lesson')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">Bright Path Schedule</h1>
            <p className="text-sm text-muted-foreground">Today's lessons, room by room, with conflicts called out.</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => setDialogOpen(true)}>Add lesson</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {conflicts.length > 0 && (
          <Card className="mb-6 ring-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">
                {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} on {date}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="destructive">{CONFLICT_LABEL[c.type] ?? c.type}</Badge>
                  <span className="text-muted-foreground">{c.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conflicts</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && lessons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No lessons scheduled on {date}.
                    </TableCell>
                  </TableRow>
                )}
                {lessons.map((lesson) => {
                  const lessonConflicts = conflictsByLesson.get(lesson.id) ?? []
                  return (
                    <TableRow key={lesson.id} className={lessonConflicts.length > 0 ? 'bg-destructive/5' : undefined}>
                      <TableCell>{lesson.startTime}<span className="text-muted-foreground"> ({lesson.durationMin}m)</span></TableCell>
                      <TableCell>{roomLabel(lesson.roomId)}</TableCell>
                      <TableCell>{tutorName(lesson.tutorId)}</TableCell>
                      <TableCell>{lesson.student}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(lesson.status)}>{STATUS_LABEL[lesson.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lessonConflicts.map((c, i) => (
                            <Badge key={i} variant="destructive">{CONFLICT_LABEL[c.type] ?? c.type}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lesson.status === 'BOOKED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelling === lesson.id}
                            onClick={() => handleCancel(lesson.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AddLessonDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={date}
          tutors={tutors}
          rooms={rooms}
          onCreated={loadSchedule}
        />
      </div>
    </div>
  )
}

export default App
