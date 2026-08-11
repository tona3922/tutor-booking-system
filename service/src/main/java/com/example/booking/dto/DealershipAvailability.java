package com.example.booking.dto;

import com.example.booking.model.Dealership;

import java.time.LocalDateTime;

public record DealershipAvailability(
        Long id,
        String name,
        String address,
        LocalDateTime openTime,
        LocalDateTime closeTime,
        int availableBayCount,
        int availableTechnicianCount) {

    public static DealershipAvailability of(Dealership dealership, int availableBayCount, int availableTechnicianCount) {
        return new DealershipAvailability(
                dealership.getId(),
                dealership.getName(),
                dealership.getAddress(),
                dealership.getOpenTime(),
                dealership.getCloseTime(),
                availableBayCount,
                availableTechnicianCount);
    }
}
