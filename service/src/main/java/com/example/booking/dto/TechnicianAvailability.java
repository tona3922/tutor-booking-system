package com.example.booking.dto;

import com.example.booking.model.Technician;

public record TechnicianAvailability(
        Long id,
        Long dealershipId,
        String name,
        String skill,
        Technician.Status status,
        boolean available) {

    public static TechnicianAvailability of(Technician technician, boolean available) {
        return new TechnicianAvailability(
                technician.getId(),
                technician.getDealershipId(),
                technician.getName(),
                technician.getSkill(),
                technician.getStatus(),
                available);
    }
}
