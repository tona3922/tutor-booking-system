package com.example.booking.service;

import com.example.booking.dto.ServiceBayAvailability;
import com.example.booking.dto.ServiceBayRequest;
import com.example.booking.model.Booking;
import com.example.booking.model.ServiceBay;
import com.example.booking.repository.BookingRepository;
import com.example.booking.repository.DealershipRepository;
import com.example.booking.repository.ServiceBayRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ServiceBayService {

    private final ServiceBayRepository serviceBayRepository;
    private final DealershipRepository dealershipRepository;
    private final BookingRepository bookingRepository;

    public ServiceBayService(ServiceBayRepository serviceBayRepository,
                              DealershipRepository dealershipRepository,
                              BookingRepository bookingRepository) {
        this.serviceBayRepository = serviceBayRepository;
        this.dealershipRepository = dealershipRepository;
        this.bookingRepository = bookingRepository;
    }

    /**
     * @param startTime and endTime, if both provided, restrict results to bays that are
     *                  AVAILABLE and not booked in that window.
     */
    public List<ServiceBay> findAll(Long dealershipId, String bayNumber, LocalDateTime startTime, LocalDateTime endTime) {
        if ((startTime == null) != (endTime == null)) {
            throw new IllegalArgumentException("startTime and endTime must be provided together");
        }

        List<ServiceBay> candidates = dealershipId == null
                ? serviceBayRepository.findAll()
                : serviceBayRepository.findByDealershipId(dealershipId);

        if (bayNumber != null && !bayNumber.isBlank()) {
            String needle = bayNumber.toLowerCase();
            candidates = candidates.stream()
                    .filter(b -> b.getBayNumber() != null && b.getBayNumber().toLowerCase().contains(needle))
                    .toList();
        }

        if (startTime != null) {
            Set<Long> busyBayIds = busyBayIds(startTime, endTime);
            candidates = candidates.stream()
                    .filter(b -> b.getStatus() == ServiceBay.Status.AVAILABLE)
                    .filter(b -> !busyBayIds.contains(b.getId()))
                    .toList();
        }

        return candidates;
    }

    /**
     * All bays matching the optional dealership/bayNumber filter, each annotated with whether
     * they're actually free -- unlike findAll(), this never drops unavailable bays from the
     * result, so callers can render a full status view (e.g. available/unavailable cards).
     */
    public List<ServiceBayAvailability> findAvailability(Long dealershipId, String bayNumber, LocalDateTime startTime, LocalDateTime endTime) {
        if ((startTime == null) != (endTime == null)) {
            throw new IllegalArgumentException("startTime and endTime must be provided together");
        }

        List<ServiceBay> candidates = dealershipId == null
                ? serviceBayRepository.findAll()
                : serviceBayRepository.findByDealershipId(dealershipId);

        if (bayNumber != null && !bayNumber.isBlank()) {
            String needle = bayNumber.toLowerCase();
            candidates = candidates.stream()
                    .filter(b -> b.getBayNumber() != null && b.getBayNumber().toLowerCase().contains(needle))
                    .toList();
        }

        Set<Long> busyBayIds = startTime != null ? busyBayIds(startTime, endTime) : Set.of();

        return candidates.stream()
                .map(b -> ServiceBayAvailability.of(b, b.getStatus() == ServiceBay.Status.AVAILABLE && !busyBayIds.contains(b.getId())))
                .toList();
    }

    private Set<Long> busyBayIds(LocalDateTime startTime, LocalDateTime endTime) {
        return bookingRepository
                .findByStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(Booking.Status.CANCELLED, endTime, startTime)
                .stream()
                .map(Booking::getServiceBayId)
                .collect(Collectors.toSet());
    }

    public ServiceBay findById(Long id) {
        return serviceBayRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Service bay not found: " + id));
    }

    public ServiceBay create(ServiceBayRequest request) {
        if (!dealershipRepository.existsById(request.getDealershipId())) {
            throw new NoSuchElementException("Dealership not found: " + request.getDealershipId());
        }
        ServiceBay bay = new ServiceBay();
        bay.setDealershipId(request.getDealershipId());
        bay.setBayNumber(request.getBayNumber());
        return serviceBayRepository.save(bay);
    }

    public ServiceBay update(Long id, ServiceBayRequest request) {
        ServiceBay bay = findById(id);
        bay.setBayNumber(request.getBayNumber());
        return serviceBayRepository.save(bay);
    }

    public ServiceBay updateStatus(Long id, ServiceBay.Status status) {
        ServiceBay bay = findById(id);
        bay.setStatus(status);
        return serviceBayRepository.save(bay);
    }

    public void delete(Long id) {
        serviceBayRepository.deleteById(id);
    }
}
