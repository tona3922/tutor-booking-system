package com.example.booking.service;

import com.example.booking.dto.DealershipAvailability;
import com.example.booking.dto.DealershipRequest;
import com.example.booking.model.Dealership;
import com.example.booking.repository.DealershipRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class DealershipService {

    private final DealershipRepository dealershipRepository;
    private final TechnicianService technicianService;
    private final ServiceBayService serviceBayService;

    public DealershipService(DealershipRepository dealershipRepository,
                              TechnicianService technicianService,
                              ServiceBayService serviceBayService) {
        this.dealershipRepository = dealershipRepository;
        this.technicianService = technicianService;
        this.serviceBayService = serviceBayService;
    }

    public List<Dealership> findAll() {
        return dealershipRepository.findAll();
    }

    /**
     * Dealerships matching an optional name/address search, each annotated with how many
     * bays and technicians are actually available in the given [startTime, endTime) window.
     */
    public List<DealershipAvailability> findAvailability(String name, LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("startTime and endTime are required");
        }

        String needle = name == null ? null : name.toLowerCase();
        return dealershipRepository.findAll().stream()
                .filter(d -> needle == null
                        || (d.getName() != null && d.getName().toLowerCase().contains(needle))
                        || (d.getAddress() != null && d.getAddress().toLowerCase().contains(needle)))
                .map(d -> {
                    int bays = serviceBayService.findAll(d.getId(), null, startTime, endTime).size();
                    int technicians = technicianService.findAll(d.getId(), null, startTime, endTime).size();
                    return DealershipAvailability.of(d, bays, technicians);
                })
                .toList();
    }

    public Dealership findById(Long id) {
        return dealershipRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Dealership not found: " + id));
    }

    public Dealership create(DealershipRequest request) {
        Dealership dealership = new Dealership();
        apply(dealership, request);
        return dealershipRepository.save(dealership);
    }

    public Dealership update(Long id, DealershipRequest request) {
        Dealership dealership = findById(id);
        apply(dealership, request);
        return dealershipRepository.save(dealership);
    }

    public void delete(Long id) {
        dealershipRepository.deleteById(id);
    }

    private void apply(Dealership dealership, DealershipRequest request) {
        dealership.setName(request.getName());
        dealership.setAddress(request.getAddress());
        dealership.setOpenTime(request.getOpenTime());
        dealership.setCloseTime(request.getCloseTime());
    }
}
