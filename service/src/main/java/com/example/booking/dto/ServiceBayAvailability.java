package com.example.booking.dto;

import com.example.booking.model.ServiceBay;

public record ServiceBayAvailability(
        Long id,
        Long dealershipId,
        String bayNumber,
        ServiceBay.Status status,
        boolean available) {

    public static ServiceBayAvailability of(ServiceBay bay, boolean available) {
        return new ServiceBayAvailability(
                bay.getId(),
                bay.getDealershipId(),
                bay.getBayNumber(),
                bay.getStatus(),
                available);
    }
}
