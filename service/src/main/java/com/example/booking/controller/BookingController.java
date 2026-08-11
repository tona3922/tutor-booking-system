package com.example.booking.controller;

import com.example.booking.dto.AssignTechnicianRequest;
import com.example.booking.dto.BookingRequest;
import com.example.booking.model.Booking;
import com.example.booking.model.BookingTechnician;
import com.example.booking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    public List<Booking> findAll(Authentication authentication) {
        return bookingService.findAll(principalId(authentication));
    }

    @GetMapping("/{id}")
    public Booking findById(Authentication authentication, @PathVariable Long id) {
        return bookingService.findByIdForCustomer(id, principalId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Booking create(Authentication authentication, @Valid @RequestBody BookingRequest request) {
        return bookingService.create(principalId(authentication), request);
    }

    @PatchMapping("/{id}/status")
    public Booking updateStatus(Authentication authentication, @PathVariable Long id, @RequestParam Booking.Status status) {
        return bookingService.updateStatus(id, principalId(authentication), status);
    }

    @PostMapping("/{id}/cancel")
    public void cancel(Authentication authentication, @PathVariable Long id) {
        bookingService.cancel(id, principalId(authentication));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        bookingService.delete(id, principalId(authentication));
    }

    @GetMapping("/{id}/technicians")
    public List<BookingTechnician> listTechnicians(Authentication authentication, @PathVariable Long id) {
        return bookingService.listTechnicians(id, principalId(authentication));
    }

    @PostMapping("/{id}/technicians")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingTechnician assignTechnician(Authentication authentication, @PathVariable Long id,
                                               @Valid @RequestBody AssignTechnicianRequest request) {
        return bookingService.assignTechnician(id, principalId(authentication), request);
    }

    @DeleteMapping("/{id}/technicians/{technicianId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignTechnician(Authentication authentication, @PathVariable Long id, @PathVariable Long technicianId) {
        bookingService.unassignTechnician(id, principalId(authentication), technicianId);
    }

    private Long principalId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
