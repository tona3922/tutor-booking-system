package com.example.booking.controller;

import com.example.booking.dto.TechnicianAvailability;
import com.example.booking.dto.TechnicianRequest;
import com.example.booking.model.Technician;
import com.example.booking.service.TechnicianService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    private final TechnicianService technicianService;

    public TechnicianController(TechnicianService technicianService) {
        this.technicianService = technicianService;
    }

    @GetMapping
    public List<Technician> findAll(@RequestParam(required = false) Long dealershipId,
                                     @RequestParam(required = false) String name,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return technicianService.findAll(dealershipId, name, startTime, endTime);
    }

    @GetMapping("/{id}")
    public Technician findById(@PathVariable Long id) {
        return technicianService.findById(id);
    }

    @GetMapping("/availability")
    public List<TechnicianAvailability> findAvailability(
            @RequestParam(required = false) Long dealershipId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return technicianService.findAvailability(dealershipId, name, startTime, endTime);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Technician create(@Valid @RequestBody TechnicianRequest request) {
        return technicianService.create(request);
    }

    @PutMapping("/{id}")
    public Technician update(@PathVariable Long id, @Valid @RequestBody TechnicianRequest request) {
        return technicianService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public Technician updateStatus(@PathVariable Long id, @RequestParam Technician.Status status) {
        return technicianService.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        technicianService.delete(id);
    }
}
