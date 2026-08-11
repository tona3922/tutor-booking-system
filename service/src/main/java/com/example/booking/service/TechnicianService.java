package com.example.booking.service;

import com.example.booking.dto.TechnicianAvailability;
import com.example.booking.dto.TechnicianRequest;
import com.example.booking.model.Booking;
import com.example.booking.model.BookingTechnician;
import com.example.booking.model.Technician;
import com.example.booking.repository.BookingRepository;
import com.example.booking.repository.BookingTechnicianRepository;
import com.example.booking.repository.DealershipRepository;
import com.example.booking.repository.TechnicianRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TechnicianService {

    private final TechnicianRepository technicianRepository;
    private final DealershipRepository dealershipRepository;
    private final BookingRepository bookingRepository;
    private final BookingTechnicianRepository bookingTechnicianRepository;

    public TechnicianService(TechnicianRepository technicianRepository,
                              DealershipRepository dealershipRepository,
                              BookingRepository bookingRepository,
                              BookingTechnicianRepository bookingTechnicianRepository) {
        this.technicianRepository = technicianRepository;
        this.dealershipRepository = dealershipRepository;
        this.bookingRepository = bookingRepository;
        this.bookingTechnicianRepository = bookingTechnicianRepository;
    }

    /**
     * @param startTime and endTime, if both provided, restrict results to technicians that are
     *                  AVAILABLE and have no overlapping assigned booking in that window.
     */
    public List<Technician> findAll(Long dealershipId, String name, LocalDateTime startTime, LocalDateTime endTime) {
        if ((startTime == null) != (endTime == null)) {
            throw new IllegalArgumentException("startTime and endTime must be provided together");
        }

        List<Technician> candidates = dealershipId == null
                ? technicianRepository.findAll()
                : technicianRepository.findByDealershipId(dealershipId);

        if (name != null && !name.isBlank()) {
            String needle = name.toLowerCase();
            candidates = candidates.stream()
                    .filter(t -> t.getName() != null && t.getName().toLowerCase().contains(needle))
                    .toList();
        }

        if (startTime != null) {
            Set<Long> busyTechnicianIds = busyTechnicianIds(startTime, endTime);
            candidates = candidates.stream()
                    .filter(t -> t.getStatus() == Technician.Status.AVAILABLE)
                    .filter(t -> !busyTechnicianIds.contains(t.getId()))
                    .toList();
        }

        return candidates;
    }

    /**
     * All technicians matching the optional dealership/name filter, each annotated with whether
     * they're actually free -- unlike findAll(), this never drops unavailable technicians from
     * the result, so callers can render a full status view (e.g. available/unavailable cards).
     */
    public List<TechnicianAvailability> findAvailability(Long dealershipId, String name, LocalDateTime startTime, LocalDateTime endTime) {
        if ((startTime == null) != (endTime == null)) {
            throw new IllegalArgumentException("startTime and endTime must be provided together");
        }

        List<Technician> candidates = dealershipId == null
                ? technicianRepository.findAll()
                : technicianRepository.findByDealershipId(dealershipId);

        if (name != null && !name.isBlank()) {
            String needle = name.toLowerCase();
            candidates = candidates.stream()
                    .filter(t -> t.getName() != null && t.getName().toLowerCase().contains(needle))
                    .toList();
        }

        Set<Long> busyTechnicianIds = startTime != null ? busyTechnicianIds(startTime, endTime) : Set.of();

        return candidates.stream()
                .map(t -> TechnicianAvailability.of(t, t.getStatus() == Technician.Status.AVAILABLE && !busyTechnicianIds.contains(t.getId())))
                .toList();
    }

    private Set<Long> busyTechnicianIds(LocalDateTime startTime, LocalDateTime endTime) {
        List<Long> overlappingBookingIds = bookingRepository
                .findByStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(Booking.Status.CANCELLED, endTime, startTime)
                .stream()
                .map(Booking::getId)
                .toList();
        if (overlappingBookingIds.isEmpty()) {
            return Set.of();
        }
        return bookingTechnicianRepository.findByBookingIdIn(overlappingBookingIds)
                .stream()
                .map(BookingTechnician::getTechnicianId)
                .collect(Collectors.toSet());
    }

    public Technician findById(Long id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Technician not found: " + id));
    }

    public Technician create(TechnicianRequest request) {
        if (!dealershipRepository.existsById(request.getDealershipId())) {
            throw new NoSuchElementException("Dealership not found: " + request.getDealershipId());
        }
        Technician technician = new Technician();
        technician.setDealershipId(request.getDealershipId());
        apply(technician, request);
        return technicianRepository.save(technician);
    }

    public Technician update(Long id, TechnicianRequest request) {
        Technician technician = findById(id);
        apply(technician, request);
        return technicianRepository.save(technician);
    }

    public Technician updateStatus(Long id, Technician.Status status) {
        Technician technician = findById(id);
        technician.setStatus(status);
        return technicianRepository.save(technician);
    }

    public void delete(Long id) {
        technicianRepository.deleteById(id);
    }

    private void apply(Technician technician, TechnicianRequest request) {
        technician.setName(request.getName());
        technician.setSkill(request.getSkill());
    }
}
