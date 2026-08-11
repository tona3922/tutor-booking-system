package com.example.booking.controller;

import com.example.booking.dto.DealershipAvailability;
import com.example.booking.dto.DealershipRequest;
import com.example.booking.model.Dealership;
import com.example.booking.service.DealershipService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/dealerships")
public class DealershipController {

    private final DealershipService dealershipService;

    public DealershipController(DealershipService dealershipService) {
        this.dealershipService = dealershipService;
    }

    @GetMapping
    public List<Dealership> findAll() {
        return dealershipService.findAll();
    }

    @GetMapping("/{id}")
    public Dealership findById(@PathVariable Long id) {
        return dealershipService.findById(id);
    }

    @GetMapping("/availability")
    public List<DealershipAvailability> findAvailability(
            @RequestParam(required = false) String name,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return dealershipService.findAvailability(name, startTime, endTime);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Dealership create(@Valid @RequestBody DealershipRequest request) {
        return dealershipService.create(request);
    }

    @PutMapping("/{id}")
    public Dealership update(@PathVariable Long id, @Valid @RequestBody DealershipRequest request) {
        return dealershipService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        dealershipService.delete(id);
    }
}
