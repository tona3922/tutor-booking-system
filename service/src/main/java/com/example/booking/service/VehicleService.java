package com.example.booking.service;

import com.example.booking.dto.VehicleRequest;
import com.example.booking.model.Vehicle;
import com.example.booking.repository.VehicleRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    public List<Vehicle> findAllForCustomer(Long customerId) {
        return vehicleRepository.findByCustomerId(customerId);
    }

    public Vehicle findByIdForCustomer(Long id, Long customerId) {
        Vehicle vehicle = findById(id);
        requireOwnership(vehicle, customerId);
        return vehicle;
    }

    public Vehicle create(Long customerId, VehicleRequest request) {
        Vehicle vehicle = new Vehicle();
        vehicle.setCustomerId(customerId);
        apply(vehicle, request);
        return vehicleRepository.save(vehicle);
    }

    public Vehicle update(Long id, Long customerId, VehicleRequest request) {
        Vehicle vehicle = findById(id);
        requireOwnership(vehicle, customerId);
        apply(vehicle, request);
        return vehicleRepository.save(vehicle);
    }

    public void delete(Long id, Long customerId) {
        Vehicle vehicle = findById(id);
        requireOwnership(vehicle, customerId);
        vehicleRepository.deleteById(id);
    }

    private Vehicle findById(Long id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Vehicle not found: " + id));
    }

    private void requireOwnership(Vehicle vehicle, Long customerId) {
        if (!vehicle.getCustomerId().equals(customerId)) {
            throw new AccessDeniedException("You do not have access to this vehicle");
        }
    }

    private void apply(Vehicle vehicle, VehicleRequest request) {
        vehicle.setPlateNumber(request.getPlateNumber());
        vehicle.setBrand(request.getBrand());
        vehicle.setModel(request.getModel());
        vehicle.setYear(request.getYear());
    }
}
