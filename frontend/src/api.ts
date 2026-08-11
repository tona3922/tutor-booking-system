export interface Customer {
  id: number
  name: string
  phone: string
  email: string
}

export interface Vehicle {
  id: number
  customerId: number
  plateNumber: string
  brand: string
  model: string
  year: number
}

export interface Dealership {
  id: number
  name: string
  address: string
  openTime: string
  closeTime: string
}

export type TechnicianStatus = 'AVAILABLE' | 'BUSY' | 'OFF_DUTY'

export interface Technician {
  id: number
  dealershipId: number
  name: string
  skill: string
  status: TechnicianStatus
}

export type ServiceBayStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

export interface ServiceBay {
  id: number
  dealershipId: number
  bayNumber: string
  status: ServiceBayStatus
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Booking {
  id: number
  customerId: number
  vehicleId: number
  dealershipId: number
  serviceBayId: number
  startTime: string
  endTime: string
  status: BookingStatus
  createdAt: string
}

export interface BookingTechnician {
  bookingId: number
  technicianId: number
  role: string
  assignedAt: string
}

export interface DealershipAvailability extends Dealership {
  availableBayCount: number
  availableTechnicianCount: number
}

export interface TechnicianAvailability extends Technician {
  available: boolean
}

export interface ServiceBayAvailability extends ServiceBay {
  available: boolean
}

const TOKEN_KEY = 'booking-system.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function get<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { headers: authHeaders() }).then((res) => handle<T>(res))
}

function post<T>(path: string, body: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((res) => handle<T>(res))
}

function patch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { method: 'PATCH', headers: authHeaders() }).then((res) => handle<T>(res))
}

function toQuery(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export interface AuthResponse {
  token: string
  customer: Customer
}

export const authApi = {
  register: (payload: { name: string; phone: string; email: string; password: string }) =>
    post<AuthResponse>('/auth/register', payload),
  login: (payload: { email: string; password: string }) => post<AuthResponse>('/auth/login', payload),
}

export const customerApi = {
  me: () => get<Customer>('/customers/me'),
}

export interface VehicleRequest {
  plateNumber: string
  brand: string
  model: string
  year: number
}

export const vehicleApi = {
  listMine: () => get<Vehicle[]>('/vehicles'),
  get: (id: number) => get<Vehicle>(`/vehicles/${id}`),
  create: (payload: VehicleRequest) => post<Vehicle>('/vehicles', payload),
}

export const dealershipApi = {
  list: () => get<Dealership[]>('/dealerships'),
  get: (id: number) => get<Dealership>(`/dealerships/${id}`),
  searchAvailability: (params: { name?: string; startTime: string; endTime: string }) =>
    get<DealershipAvailability[]>(`/dealerships/availability${toQuery(params)}`),
}

export interface TechnicianSearchParams {
  dealershipId?: number
  name?: string
  startTime?: string
  endTime?: string
}

export const technicianApi = {
  search: (params: TechnicianSearchParams) => get<Technician[]>(`/technicians${toQuery(params)}`),
  searchAvailability: (params: TechnicianSearchParams) =>
    get<TechnicianAvailability[]>(`/technicians/availability${toQuery(params)}`),
  get: (id: number) => get<Technician>(`/technicians/${id}`),
}

export interface ServiceBaySearchParams {
  dealershipId?: number
  bayNumber?: string
  startTime?: string
  endTime?: string
}

export const serviceBayApi = {
  search: (params: ServiceBaySearchParams) => get<ServiceBay[]>(`/service-bays${toQuery(params)}`),
  searchAvailability: (params: ServiceBaySearchParams) =>
    get<ServiceBayAvailability[]>(`/service-bays/availability${toQuery(params)}`),
  get: (id: number) => get<ServiceBay>(`/service-bays/${id}`),
}

export interface BookingRequest {
  vehicleId: number
  dealershipId: number
  serviceBayId: number
  startTime: string
  endTime: string
}

export const bookingApi = {
  listMine: () => get<Booking[]>('/bookings'),
  create: (payload: BookingRequest) => post<Booking>('/bookings', payload),
  updateStatus: (id: number, status: BookingStatus) => patch<Booking>(`/bookings/${id}/status?status=${status}`),
  cancel: (id: number) => post<void>(`/bookings/${id}/cancel`, {}),
  listTechnicians: (bookingId: number) => get<BookingTechnician[]>(`/bookings/${bookingId}/technicians`),
  assignTechnician: (bookingId: number, technicianId: number, role: string) =>
    post<BookingTechnician>(`/bookings/${bookingId}/technicians`, { technicianId, role }),
}
