export interface Tutor {
  id: number
  name: string
  subject: string
  phone: string
}

export interface Room {
  id: number
  label: string
}

export type LessonStatus = 'BOOKED' | 'CANCELLED' | 'NO_SHOW' | 'MOVED'

export interface Lesson {
  id: number
  date: string
  startTime: string
  durationMin: number
  student: string
  tutorId: number
  roomId: number
  status: LessonStatus
  cancelledAt: string | null
  note: string | null
  movedFromLessonId: number | null
  createdAt: string
}

export type ConflictType =
  | 'STUDENT_DOUBLE_BOOKED'
  | 'TUTOR_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'TUTOR_OVERLOADED'
  | 'CLOSED_DAY'

export interface Conflict {
  type: ConflictType
  lessonIds: number[]
  message: string
}

export interface ConflictError {
  error: string
  conflicts: Conflict[]
}

export class ApiError extends Error {
  conflicts?: Conflict[]

  constructor(message: string, conflicts?: Conflict[]) {
    super(message)
    this.conflicts = conflicts
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error ?? `Request failed: ${res.status}`, body.conflicts)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

function get<T>(path: string): Promise<T> {
  return fetch(`/api${path}`).then((res) => handle<T>(res))
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => handle<T>(res))
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: 'PATCH',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((res) => handle<T>(res))
}

export const tutorApi = {
  list: () => get<Tutor[]>('/tutors'),
}

export const roomApi = {
  list: () => get<Room[]>('/rooms'),
}

export interface LessonRequest {
  date: string
  startTime: string
  durationMin: number
  student: string
  tutorId: number
  roomId: number
  note?: string
}

export interface RescheduleRequest {
  date: string
  startTime: string
  durationMin: number
  tutorId: number
  roomId: number
  note?: string
}

export interface CancelResult {
  lesson: Lesson
  chargeable: boolean
}

export const lessonApi = {
  listForDate: (date: string) => get<Lesson[]>(`/lessons?date=${date}`),
  conflictsForDate: (date: string) => get<Conflict[]>(`/conflicts?date=${date}`),
  create: (payload: LessonRequest) => post<Lesson>('/lessons', payload),
  cancel: (id: number) => patch<CancelResult>(`/lessons/${id}/cancel`),
  reschedule: (id: number, payload: RescheduleRequest) => patch<Lesson>(`/lessons/${id}/reschedule`, payload),
}
