package com.example.booking.repository;

import com.example.booking.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByServiceBayIdAndStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(
            Long serviceBayId, Booking.Status excludedStatus, LocalDateTime endTime, LocalDateTime startTime);

    List<Booking> findByCustomerId(Long customerId);

    List<Booking> findByStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(
            Booking.Status excludedStatus, LocalDateTime endTime, LocalDateTime startTime);
}
