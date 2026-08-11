package com.example.booking.repository;

import com.example.booking.model.BookingTechnician;
import com.example.booking.model.BookingTechnicianId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingTechnicianRepository extends JpaRepository<BookingTechnician, BookingTechnicianId> {
    List<BookingTechnician> findByBookingId(Long bookingId);

    List<BookingTechnician> findByTechnicianId(Long technicianId);

    List<BookingTechnician> findByBookingIdIn(List<Long> bookingIds);

    boolean existsByBookingIdAndTechnicianId(Long bookingId, Long technicianId);

    void deleteByBookingIdAndTechnicianId(Long bookingId, Long technicianId);
}
