package com.example.booking.dto;

import jakarta.validation.constraints.NotNull;

public class AssignTechnicianRequest {

    @NotNull
    private Long technicianId;

    private String role;

    public Long getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(Long technicianId) {
        this.technicianId = technicianId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
