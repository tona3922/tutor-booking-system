package com.example.booking.repository;

import com.example.booking.model.Technician;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TechnicianRepository extends JpaRepository<Technician, Long> {
    List<Technician> findByDealershipId(Long dealershipId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Technician t where t.id = :id")
    Optional<Technician> findByIdForUpdate(@Param("id") Long id);
}
