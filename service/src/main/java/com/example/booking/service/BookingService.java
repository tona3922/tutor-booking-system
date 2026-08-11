package com.example.booking.service;

import com.example.booking.dto.AssignTechnicianRequest;
import com.example.booking.dto.BookingRequest;
import com.example.booking.model.Booking;
import com.example.booking.model.BookingTechnician;
import com.example.booking.model.ServiceBay;
import com.example.booking.model.Technician;
import com.example.booking.model.Vehicle;
import com.example.booking.repository.BookingRepository;
import com.example.booking.repository.BookingTechnicianRepository;
import com.example.booking.repository.DealershipRepository;
import com.example.booking.repository.ServiceBayRepository;
import com.example.booking.repository.TechnicianRepository;
import com.example.booking.repository.VehicleRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingTechnicianRepository bookingTechnicianRepository;
    private final VehicleRepository vehicleRepository;
    private final DealershipRepository dealershipRepository;
    private final ServiceBayRepository serviceBayRepository;
    private final TechnicianRepository technicianRepository;

    public BookingService(BookingRepository bookingRepository,
                           BookingTechnicianRepository bookingTechnicianRepository,
                           VehicleRepository vehicleRepository,
                           DealershipRepository dealershipRepository,
                           ServiceBayRepository serviceBayRepository,
                           TechnicianRepository technicianRepository) {
        this.bookingRepository = bookingRepository;
        this.bookingTechnicianRepository = bookingTechnicianRepository;
        this.vehicleRepository = vehicleRepository;
        this.dealershipRepository = dealershipRepository;
        this.serviceBayRepository = serviceBayRepository;
        this.technicianRepository = technicianRepository;
    }

    public List<Booking> findAll(Long customerId) {
        return bookingRepository.findByCustomerId(customerId);
    }

    public Booking findByIdForCustomer(Long id, Long customerId) {
        Booking booking = findById(id);
        requireOwnership(booking, customerId);
        return booking;
    }

    @Transactional
    public Booking create(Long customerId, BookingRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("endTime must be after startTime");
        }

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new NoSuchElementException("Vehicle not found: " + request.getVehicleId()));
        if (!vehicle.getCustomerId().equals(customerId)) {
            throw new IllegalArgumentException("Vehicle does not belong to this customer");
        }
        if (!dealershipRepository.existsById(request.getDealershipId())) {
            throw new NoSuchElementException("Dealership not found: " + request.getDealershipId());
        }
        // Locks the bay row for the rest of this transaction so a concurrent create() for the
        // same bay blocks here instead of racing past the overlap check below.
        ServiceBay bay = serviceBayRepository.findByIdForUpdate(request.getServiceBayId())
                .orElseThrow(() -> new NoSuchElementException("Service bay not found: " + request.getServiceBayId()));
        if (!bay.getDealershipId().equals(request.getDealershipId())) {
            throw new IllegalArgumentException("Service bay does not belong to this dealership");
        }

        List<Booking> overlapping = bookingRepository
                .findByServiceBayIdAndStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(
                        bay.getId(), Booking.Status.CANCELLED, request.getEndTime(), request.getStartTime());
        if (!overlapping.isEmpty()) {
            throw new IllegalStateException("Service bay is already booked for this time range");
        }

        Booking booking = new Booking();
        booking.setCustomerId(customerId);
        booking.setVehicleId(request.getVehicleId());
        booking.setDealershipId(request.getDealershipId());
        booking.setServiceBayId(request.getServiceBayId());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setStatus(Booking.Status.PENDING);
        return bookingRepository.save(booking);
    }

    public Booking updateStatus(Long id, Long customerId, Booking.Status status) {
        Booking booking = findByIdForCustomer(id, customerId);
        booking.setStatus(status);
        return bookingRepository.save(booking);
    }

    public void cancel(Long id, Long customerId) {
        Booking booking = findByIdForCustomer(id, customerId);
        booking.setStatus(Booking.Status.CANCELLED);
        bookingRepository.save(booking);
    }

    public void delete(Long id, Long customerId) {
        findByIdForCustomer(id, customerId);
        bookingRepository.deleteById(id);
    }

    public List<BookingTechnician> listTechnicians(Long bookingId, Long customerId) {
        findByIdForCustomer(bookingId, customerId);
        return bookingTechnicianRepository.findByBookingId(bookingId);
    }

    @Transactional
    public BookingTechnician assignTechnician(Long bookingId, Long customerId, AssignTechnicianRequest request) {
        Booking booking = findByIdForCustomer(bookingId, customerId);
        // Locks the technician row for the rest of this transaction so a concurrent assignment
        // of the same technician blocks here instead of racing past the overlap check below.
        Technician technician = technicianRepository.findByIdForUpdate(request.getTechnicianId())
                .orElseThrow(() -> new NoSuchElementException("Technician not found: " + request.getTechnicianId()));

        if (!technician.getDealershipId().equals(booking.getDealershipId())) {
            throw new IllegalArgumentException("Technician does not belong to this booking's dealership");
        }
        if (bookingTechnicianRepository.existsByBookingIdAndTechnicianId(bookingId, technician.getId())) {
            throw new IllegalStateException("Technician is already assigned to this booking");
        }

        List<Long> existingBookingIds = bookingTechnicianRepository.findByTechnicianId(technician.getId())
                .stream()
                .map(BookingTechnician::getBookingId)
                .toList();
        boolean hasConflict = bookingRepository.findAllById(existingBookingIds).stream()
                .anyMatch(b -> b.getStatus() != Booking.Status.CANCELLED
                        && b.getStartTime().isBefore(booking.getEndTime())
                        && b.getEndTime().isAfter(booking.getStartTime()));
        if (hasConflict) {
            throw new IllegalStateException("Technician is already booked for an overlapping time");
        }

        BookingTechnician bookingTechnician = new BookingTechnician();
        bookingTechnician.setBookingId(bookingId);
        bookingTechnician.setTechnicianId(technician.getId());
        bookingTechnician.setRole(request.getRole());
        return bookingTechnicianRepository.save(bookingTechnician);
    }

    @Transactional
    public void unassignTechnician(Long bookingId, Long customerId, Long technicianId) {
        findByIdForCustomer(bookingId, customerId);
        bookingTechnicianRepository.deleteByBookingIdAndTechnicianId(bookingId, technicianId);
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Booking not found: " + id));
    }

    private void requireOwnership(Booking booking, Long customerId) {
        if (!booking.getCustomerId().equals(customerId)) {
            throw new AccessDeniedException("You do not have access to this booking");
        }
    }
}
