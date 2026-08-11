package com.example.booking.controller;

import com.example.booking.dto.VehicleRequest;
import com.example.booking.model.Vehicle;
import com.example.booking.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @GetMapping
    public List<Vehicle> findAll(Authentication authentication) {
        return vehicleService.findAllForCustomer(principalId(authentication));
    }

    @GetMapping("/{id}")
    public Vehicle findById(Authentication authentication, @PathVariable Long id) {
        return vehicleService.findByIdForCustomer(id, principalId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Vehicle create(Authentication authentication, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.create(principalId(authentication), request);
    }

    @PutMapping("/{id}")
    public Vehicle update(Authentication authentication, @PathVariable Long id, @Valid @RequestBody VehicleRequest request) {
        return vehicleService.update(id, principalId(authentication), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        vehicleService.delete(id, principalId(authentication));
    }

    private Long principalId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
