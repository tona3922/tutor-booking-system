import type { Conflict, Lesson } from '../api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { CONFLICT_LABEL, STATUS_LABEL, statusVariant } from '../lib/lesson-status'
import { addMinutesToTime, formatTime } from '../lib/time'

interface Props {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  tutorName: (id: number) => string
  roomLabel: (id: number) => string
  conflicts: Conflict[]
  onCancel: (id: number) => void
  cancelling: number | null
}

export function LessonDetailsDialog({
  lesson,
  open,
  onOpenChange,
  tutorName,
  roomLabel,
  conflicts,
  onCancel,
  cancelling,
}: Props) {
  if (!lesson) return null

  const start = formatTime(lesson.startTime)
  const end = formatTime(addMinutesToTime(lesson.startTime, lesson.durationMin))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lesson.student}</DialogTitle>
          <DialogDescription>
            {roomLabel(lesson.roomId)} &middot; {lesson.date} &middot; {start}&ndash;{end}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusVariant(lesson.status)}>{STATUS_LABEL[lesson.status]}</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tutor</span>
            <span className="font-medium">{tutorName(lesson.tutorId)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Student</span>
            <span className="font-medium">{lesson.student}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium">{roomLabel(lesson.roomId)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{start}&ndash;{end} ({lesson.durationMin} min)</span>
          </div>

          {lesson.note && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Note</span>
              <span>{lesson.note}</span>
            </div>
          )}

          {conflicts.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-1.5">
                {conflicts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="destructive">{CONFLICT_LABEL[c.type] ?? c.type}</Badge>
                    <span className="text-muted-foreground">{c.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {lesson.status === 'BOOKED' && (
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={cancelling === lesson.id}
              onClick={() => onCancel(lesson.id)}
            >
              {cancelling === lesson.id ? 'Cancelling...' : 'Cancel lesson'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
