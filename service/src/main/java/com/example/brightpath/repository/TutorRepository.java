package com.example.brightpath.repository;

import com.example.brightpath.model.Tutor;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TutorRepository extends JpaRepository<Tutor, Long> {

    /**
     * Locks the tutor row for the rest of this transaction so a concurrent create/reschedule for
     * the same tutor blocks here instead of racing past the overlap check.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tutor t where t.id = :id")
    Optional<Tutor> findByIdForUpdate(@Param("id") Long id);
}
