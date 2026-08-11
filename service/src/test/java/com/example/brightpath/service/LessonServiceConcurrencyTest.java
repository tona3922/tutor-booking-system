package com.example.brightpath.service;

import com.example.brightpath.dto.LessonRequest;
import com.example.brightpath.model.Lesson;
import com.example.brightpath.model.Room;
import com.example.brightpath.model.Tutor;
import com.example.brightpath.repository.LessonRepository;
import com.example.brightpath.repository.RoomRepository;
import com.example.brightpath.repository.TutorRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises LessonService against a real Postgres container (H2 doesn't emulate row-locking
 * semantics) to prove the PESSIMISTIC_WRITE locks taken in create() actually serialize concurrent
 * requests for the same room/tutor instead of letting both through - the exact "booked into two
 * places at once" failure the brief's owner says can never happen again.
 */
@SpringBootTest
@Testcontainers
class LessonServiceConcurrencyTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private LessonService lessonService;
    @Autowired
    private LessonRepository lessonRepository;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private TutorRepository tutorRepository;

    private static final LocalDate DATE = LocalDate.of(2026, 3, 11);
    private static final LocalTime BASE_START = LocalTime.of(10, 0);

    @Test
    void concurrentOverlappingLessonsInSameRoomOnlyOneSucceeds() throws Exception {
        Long roomId = roomRepository.save(room("Race Room")).getId();
        Long tutorAId = tutorRepository.save(tutor("Race Tutor A")).getId();
        Long tutorBId = tutorRepository.save(tutor("Race Tutor B")).getId();

        LessonRequest requestA = lessonRequest("Student A", tutorAId, roomId, BASE_START, 60);
        LessonRequest requestB = lessonRequest("Student B", tutorBId, roomId, BASE_START.plusMinutes(30), 60);

        List<Boolean> outcomes = raceTwo(
                () -> lessonService.create(requestA),
                () -> lessonService.create(requestB)
        );

        assertThat(outcomes).containsExactlyInAnyOrder(true, false);
        assertThat(lessonRepository.findByDateAndStatusIn(DATE, List.of(Lesson.Status.BOOKED)).stream()
                .filter(l -> l.getRoomId().equals(roomId))).hasSize(1);
    }

    @Test
    void concurrentOverlappingLessonsForSameTutorOnlyOneSucceeds() throws Exception {
        Long room1Id = roomRepository.save(room("Race Room 1")).getId();
        Long room2Id = roomRepository.save(room("Race Room 2")).getId();
        Long tutorId = tutorRepository.save(tutor("Race Tutor")).getId();

        LessonRequest requestA = lessonRequest("Student A", tutorId, room1Id, BASE_START, 60);
        LessonRequest requestB = lessonRequest("Student B", tutorId, room2Id, BASE_START.plusMinutes(30), 60);

        List<Boolean> outcomes = raceTwo(
                () -> lessonService.create(requestA),
                () -> lessonService.create(requestB)
        );

        assertThat(outcomes).containsExactlyInAnyOrder(true, false);
        assertThat(lessonRepository.findByDateAndStatusIn(DATE, List.of(Lesson.Status.BOOKED)).stream()
                .filter(l -> l.getTutorId().equals(tutorId))).hasSize(1);
    }

    private LessonRequest lessonRequest(String student, Long tutorId, Long roomId, LocalTime start, int durationMin) {
        LessonRequest request = new LessonRequest();
        request.setDate(DATE);
        request.setStartTime(start);
        request.setDurationMin(durationMin);
        request.setStudent(student);
        request.setTutorId(tutorId);
        request.setRoomId(roomId);
        return request;
    }

    private Room room(String label) {
        Room room = new Room();
        room.setLabel(label + "-" + System.nanoTime());
        return room;
    }

    private Tutor tutor(String name) {
        Tutor tutor = new Tutor();
        tutor.setName(name + "-" + System.nanoTime());
        tutor.setSubject("General");
        return tutor;
    }

    /**
     * Runs both actions on separate threads gated behind a CyclicBarrier so they hit the
     * database at nearly the same instant, exercising lock contention rather than relying on
     * the two calls happening to serialize naturally due to thread scheduling.
     */
    private List<Boolean> raceTwo(Callable<?> first, Callable<?> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        try {
            List<Future<Boolean>> futures = List.of(
                    pool.submit(() -> attempt(first, barrier)),
                    pool.submit(() -> attempt(second, barrier))
            );
            List<Boolean> outcomes = new ArrayList<>();
            for (Future<Boolean> future : futures) {
                outcomes.add(future.get(30, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    private boolean attempt(Callable<?> action, CyclicBarrier barrier) throws Exception {
        barrier.await();
        try {
            action.call();
            return true;
        } catch (LessonConflictException e) {
            return false;
        }
    }
}
