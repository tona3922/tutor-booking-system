package com.example.booking.model;

import java.io.Serializable;
import java.util.Objects;

public class BookingTechnicianId implements Serializable {

    private Long bookingId;

    private Long technicianId;

    public BookingTechnicianId() {
    }

    public BookingTechnicianId(Long bookingId, Long technicianId) {
        this.bookingId = bookingId;
        this.technicianId = technicianId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BookingTechnicianId that)) return false;
        return Objects.equals(bookingId, that.bookingId) && Objects.equals(technicianId, that.technicianId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bookingId, technicianId);
    }
}
