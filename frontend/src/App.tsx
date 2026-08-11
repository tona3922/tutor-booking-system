import { useEffect, useState } from 'react'
import type { Booking, Customer, Dealership, Vehicle } from './api'
import { clearToken, customerApi, getToken } from './api'
import { Nav } from './components/Nav'
import { AuthStep } from './steps/AuthStep'
import { VehicleStep } from './steps/VehicleStep'
import { DealershipStep } from './steps/DealershipStep'
import { SearchDashboard } from './steps/SearchDashboard'
import { BookingDetailsStep } from './steps/BookingDetailsStep'
import type { BookingDetails } from './steps/BookingDetailsStep'
import { ReviewStep } from './steps/ReviewStep'
import { MyBookingsStep } from './steps/MyBookingsStep'
import { ConfirmationStep } from './steps/ConfirmationStep'

interface BookingPrefill {
  startTime?: string
  endTime?: string
  bayId?: number
  technicianId?: number
}

// Which tab a booking was started from, so the wizard's "Back" button can
// return to the right place instead of a removed catch-all mode screen.
type BookingOrigin = 'dealership' | 'dashboard'

type Step =
  | { name: 'dealership' }
  | { name: 'dashboard' }
  | { name: 'bookingDetails'; dealership: Dealership; prefill?: BookingPrefill; origin: BookingOrigin }
  | { name: 'auth'; purpose: 'booking'; dealership: Dealership; details: BookingDetails; origin: BookingOrigin }
  | { name: 'auth'; purpose: 'viewBookings' }
  | { name: 'auth'; purpose: 'standalone' }
  | { name: 'vehicle'; dealership: Dealership; details: BookingDetails; customer: Customer; origin: BookingOrigin }
  | {
      name: 'review'
      dealership: Dealership
      details: BookingDetails
      customer: Customer
      vehicle: Vehicle
      origin: BookingOrigin
    }
  | { name: 'myBookings'; customer: Customer }
  | { name: 'confirmation'; booking: Booking }

function detailsToPrefill(details: BookingDetails): BookingPrefill {
  return {
    startTime: details.startTime,
    endTime: details.endTime,
    bayId: details.bay.id,
    technicianId: details.technicians[0]?.id,
  }
}

function App() {
  const [step, setStep] = useState<Step>({ name: 'dashboard' })
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Restore the session from a persisted token so returning users don't have
  // to log in again just to view booking history or make a new booking.
  useEffect(() => {
    if (!getToken()) {
      setAuthLoading(false)
      return
    }
    customerApi
      .me()
      .then(setCustomer)
      .catch(() => clearToken())
      .finally(() => setAuthLoading(false))
  }, [])

  const handleLogout = () => {
    clearToken()
    setCustomer(null)
    setStep({ name: 'dashboard' })
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-balance">
          Vehicle Service Booking
        </h1>

        <Nav
          customer={customer}
          authLoading={authLoading}
          onNavigate={(target) => {
            if (target === 'search') setStep({ name: 'dashboard' })
            else if (target === 'guided') setStep({ name: 'dealership' })
            else if (customer) setStep({ name: 'myBookings', customer })
            else setStep({ name: 'auth', purpose: 'viewBookings' })
          }}
          onLogin={() => setStep({ name: 'auth', purpose: 'standalone' })}
          onLogout={handleLogout}
        />

        {step.name === 'dealership' && (
          <DealershipStep
            onComplete={(dealership) => setStep({ name: 'bookingDetails', dealership, origin: 'dealership' })}
          />
        )}

        {step.name === 'dashboard' && (
          <SearchDashboard
            onBook={(dealership, prefill) =>
              setStep({ name: 'bookingDetails', dealership, prefill, origin: 'dashboard' })
            }
          />
        )}

        {step.name === 'bookingDetails' && (
          <BookingDetailsStep
            dealership={step.dealership}
            initialStartTime={step.prefill?.startTime}
            initialEndTime={step.prefill?.endTime}
            initialBayId={step.prefill?.bayId}
            initialTechnicianId={step.prefill?.technicianId}
            onComplete={(details) =>
              customer
                ? setStep({ name: 'vehicle', dealership: step.dealership, details, customer, origin: step.origin })
                : setStep({ name: 'auth', purpose: 'booking', dealership: step.dealership, details, origin: step.origin })
            }
            onBack={() => setStep({ name: step.origin })}
          />
        )}

        {step.name === 'auth' && step.purpose === 'booking' && (
          <AuthStep
            onComplete={(loggedInCustomer) => {
              setCustomer(loggedInCustomer)
              setStep({
                name: 'vehicle',
                dealership: step.dealership,
                details: step.details,
                customer: loggedInCustomer,
                origin: step.origin,
              })
            }}
            onBack={() =>
              setStep({
                name: 'bookingDetails',
                dealership: step.dealership,
                prefill: detailsToPrefill(step.details),
                origin: step.origin,
              })
            }
          />
        )}

        {step.name === 'auth' && step.purpose === 'viewBookings' && (
          <AuthStep
            onComplete={(loggedInCustomer) => {
              setCustomer(loggedInCustomer)
              setStep({ name: 'myBookings', customer: loggedInCustomer })
            }}
          />
        )}

        {step.name === 'auth' && step.purpose === 'standalone' && (
          <AuthStep
            onComplete={(loggedInCustomer) => {
              setCustomer(loggedInCustomer)
              setStep({ name: 'dashboard' })
            }}
          />
        )}

        {step.name === 'vehicle' && (
          <VehicleStep
            onComplete={(vehicle) =>
              setStep({
                name: 'review',
                dealership: step.dealership,
                details: step.details,
                customer: step.customer,
                vehicle,
                origin: step.origin,
              })
            }
            onBack={() =>
              setStep({
                name: 'bookingDetails',
                dealership: step.dealership,
                prefill: detailsToPrefill(step.details),
                origin: step.origin,
              })
            }
          />
        )}

        {step.name === 'review' && (
          <ReviewStep
            dealership={step.dealership}
            details={step.details}
            customer={step.customer}
            vehicle={step.vehicle}
            onComplete={(_customer, booking) => setStep({ name: 'confirmation', booking })}
            onBack={() =>
              setStep({
                name: 'vehicle',
                dealership: step.dealership,
                details: step.details,
                customer: step.customer,
                origin: step.origin,
              })
            }
          />
        )}

        {step.name === 'myBookings' && <MyBookingsStep customer={step.customer} onLogout={handleLogout} />}

        {step.name === 'confirmation' && (
          <ConfirmationStep booking={step.booking} onStartOver={() => setStep({ name: 'dashboard' })} />
        )}
      </div>
    </div>
  )
}

export default App
