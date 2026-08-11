package com.example.booking.controller;

import com.example.booking.dto.ServiceBayAvailability;
import com.example.booking.dto.ServiceBayRequest;
import com.example.booking.model.ServiceBay;
import com.example.booking.service.ServiceBayService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/service-bays")
public class ServiceBayController {

    private final ServiceBayService serviceBayService;

    public ServiceBayController(ServiceBayService serviceBayService) {
        this.serviceBayService = serviceBayService;
    }

    @GetMapping
    public List<ServiceBay> findAll(@RequestParam(required = false) Long dealershipId,
                                     @RequestParam(required = false) String bayNumber,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return serviceBayService.findAll(dealershipId, bayNumber, startTime, endTime);
    }

    @GetMapping("/{id}")
    public ServiceBay findById(@PathVariable Long id) {
        return serviceBayService.findById(id);
    }

    @GetMapping("/availability")
    public List<ServiceBayAvailability> findAvailability(
            @RequestParam(required = false) Long dealershipId,
            @RequestParam(required = false) String bayNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return serviceBayService.findAvailability(dealershipId, bayNumber, startTime, endTime);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceBay create(@Valid @RequestBody ServiceBayRequest request) {
        return serviceBayService.create(request);
    }

    @PutMapping("/{id}")
    public ServiceBay update(@PathVariable Long id, @Valid @RequestBody ServiceBayRequest request) {
        return serviceBayService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public ServiceBay updateStatus(@PathVariable Long id, @RequestParam ServiceBay.Status status) {
        return serviceBayService.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        serviceBayService.delete(id);
    }
}
