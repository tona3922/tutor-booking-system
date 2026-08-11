import type { Lesson } from '../api'

export const STATUS_LABEL: Record<Lesson['status'], string> = {
  BOOKED: 'Booked',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
  MOVED: 'Moved',
}

export function statusVariant(status: Lesson['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'CANCELLED':
    case 'MOVED':
      return 'outline'
    case 'NO_SHOW':
      return 'destructive'
    default:
      return 'default'
  }
}

export const CONFLICT_LABEL: Record<string, string> = {
  STUDENT_DOUBLE_BOOKED: 'Student double-booked',
  TUTOR_DOUBLE_BOOKED: 'Tutor double-booked',
  ROOM_DOUBLE_BOOKED: 'Room double-booked',
  TUTOR_OVERLOADED: 'Tutor over daily cap',
  CLOSED_DAY: 'Scheduled on a closed day',
}
