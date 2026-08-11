package com.example.brightpath.repository;

import com.example.brightpath.model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

    List<Lesson> findByDateOrderByStartTimeAsc(LocalDate date);

    List<Lesson> findByDateAndStatusIn(LocalDate date, List<Lesson.Status> statuses);

    /**
     * Takes a session-scoped Postgres advisory lock keyed on the student's name so a concurrent
     * create/reschedule for the same student blocks here instead of racing past the overlap
     * check. Released automatically at transaction end. There is no Student row to lock (the
     * export only has names), so this is the name-keyed stand-in for the Room/Tutor row locks.
     */
    @Query(value = "select pg_advisory_xact_lock(hashtext(:student))", nativeQuery = true)
    void lockStudent(@Param("student") String student);
}
