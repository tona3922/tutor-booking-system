package com.example.brightpath.service;

import com.example.brightpath.dto.CancelResult;
import com.example.brightpath.dto.ConflictDto;
import com.example.brightpath.dto.ConflictType;
import com.example.brightpath.dto.LessonRequest;
import com.example.brightpath.dto.RescheduleRequest;
import com.example.brightpath.model.Lesson;
import com.example.brightpath.model.Room;
import com.example.brightpath.model.Tutor;
import com.example.brightpath.repository.LessonRepository;
import com.example.brightpath.repository.RoomRepository;
import com.example.brightpath.repository.TutorRepository;
import com.example.brightpath.time.NowProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Home for every scheduling rule from the brief. detectConflicts() reads the schedule that's
 * already in the database and reports what's wrong with it (used for historical/seed data, which
 * we load as-is and never retroactively reject). create()/reschedule() run the same overlap and
 * load checks against a candidate lesson *before* it's committed, so new conflicts can't be
 * created going forward - see DECISIONS.md for why that split exists.
 */
@Service
public class LessonService {

    private static final int MAX_BOOKINGS_PER_TUTOR_PER_DAY = 6;
    private static final List<Lesson.Status> OCCUPYING = List.of(Lesson.Status.BOOKED, Lesson.Status.NO_SHOW);

    private final LessonRepository lessonRepository;
    private final RoomRepository roomRepository;
    private final TutorRepository tutorRepository;
    private final NowProvider nowProvider;

    public LessonService(LessonRepository lessonRepository,
                          RoomRepository roomRepository,
                          TutorRepository tutorRepository,
                          NowProvider nowProvider) {
        this.lessonRepository = lessonRepository;
        this.roomRepository = roomRepository;
        this.tutorRepository = tutorRepository;
        this.nowProvider = nowProvider;
    }

    public List<Lesson> findByDate(LocalDate date) {
        return lessonRepository.findByDateOrderByStartTimeAsc(date);
    }

    // ---- detection over the existing schedule -----------------------------------------------

    public List<ConflictDto> detectConflicts(LocalDate date) {
        List<Lesson> occupying = lessonRepository.findByDateAndStatusIn(date, OCCUPYING);
        List<ConflictDto> conflicts = new ArrayList<>();

        conflicts.addAll(pairwiseConflicts(occupying, ConflictType.ROOM_DOUBLE_BOOKED, Lesson::getRoomId));
        conflicts.addAll(pairwiseConflicts(occupying, ConflictType.TUTOR_DOUBLE_BOOKED, Lesson::getTutorId));
        conflicts.addAll(studentConflicts(occupying));
        conflicts.addAll(tutorLoadConflicts(occupying));

        if (date.getDayOfWeek() == DayOfWeek.MONDAY && !occupying.isEmpty()) {
            conflicts.add(new ConflictDto(ConflictType.CLOSED_DAY,
                    occupying.stream().map(Lesson::getId).toList(),
                    "The centre is closed Mondays but " + occupying.size() + " lesson(s) are scheduled on " + date));
        }
        return conflicts;
    }

    /** Groups lessons by the given resource (room or tutor) and flags overlapping pairs, honouring the exam-pair exception. */
    private List<ConflictDto> pairwiseConflicts(List<Lesson> lessons, ConflictType type, java.util.function.Function<Lesson, Long> resourceKey) {
        List<ConflictDto> conflicts = new ArrayList<>();
        for (int i = 0; i < lessons.size(); i++) {
            for (int j = i + 1; j < lessons.size(); j++) {
                Lesson a = lessons.get(i);
                Lesson b = lessons.get(j);
                if (!resourceKey.apply(a).equals(resourceKey.apply(b))) continue;
                if (!overlaps(a, b)) continue;
                if (isAllowedExamPair(a, b, lessons)) continue;
                conflicts.add(new ConflictDto(type, List.of(a.getId(), b.getId()),
                        type + " between lesson " + a.getId() + " and lesson " + b.getId() + " on " + a.getDate()));
            }
        }
        return conflicts;
    }

    private List<ConflictDto> studentConflicts(List<Lesson> lessons) {
        List<ConflictDto> conflicts = new ArrayList<>();
        for (int i = 0; i < lessons.size(); i++) {
            for (int j = i + 1; j < lessons.size(); j++) {
                Lesson a = lessons.get(i);
                Lesson b = lessons.get(j);
                if (!sameStudent(a, b)) continue;
                if (!overlaps(a, b)) continue;
                // Never exempt - the exam-pair exception is about one tutor teaching two
                // *different* students at once, not the same student in two places.
                conflicts.add(new ConflictDto(ConflictType.STUDENT_DOUBLE_BOOKED, List.of(a.getId(), b.getId()),
                        a.getStudent() + " is booked into lesson " + a.getId() + " and lesson " + b.getId()
                                + " at overlapping times on " + a.getDate()));
            }
        }
        return conflicts;
    }

    private List<ConflictDto> tutorLoadConflicts(List<Lesson> lessons) {
        List<ConflictDto> conflicts = new ArrayList<>();
        lessons.stream().map(Lesson::getTutorId).distinct().forEach(tutorId -> {
            List<Long> ids = lessons.stream().filter(l -> l.getTutorId().equals(tutorId)).map(Lesson::getId).toList();
            if (ids.size() > MAX_BOOKINGS_PER_TUTOR_PER_DAY) {
                conflicts.add(new ConflictDto(ConflictType.TUTOR_OVERLOADED, ids,
                        "Tutor " + tutorId + " has " + ids.size() + " lessons on " + lessons.get(0).getDate()
                                + ", over the " + MAX_BOOKINGS_PER_TUTOR_PER_DAY + "/day cap"));
            }
        });
        return conflicts;
    }

    /**
     * An "exam pair": two lessons sharing the same room, tutor, start time and duration but
     * different students - the receptionist's admitted, sanctioned practice of teaching two
     * students at once for exam prep. Allowed only up to a pair; a third lesson landing on the
     * exact same slot is flagged like any other overlap.
     */
    private boolean isAllowedExamPair(Lesson a, Lesson b, List<Lesson> allForDate) {
        if (!a.getRoomId().equals(b.getRoomId())) return false;
        if (!a.getTutorId().equals(b.getTutorId())) return false;
        if (!a.getStartTime().equals(b.getStartTime())) return false;
        if (!a.getDurationMin().equals(b.getDurationMin())) return false;
        if (sameStudent(a, b)) return false;
        long sameSlotCount = allForDate.stream()
                .filter(l -> l.getRoomId().equals(a.getRoomId())
                        && l.getTutorId().equals(a.getTutorId())
                        && l.getStartTime().equals(a.getStartTime())
                        && l.getDurationMin().equals(a.getDurationMin()))
                .count();
        return sameSlotCount <= 2;
    }

    private boolean sameStudent(Lesson a, Lesson b) {
        return a.getStudent().trim().equalsIgnoreCase(b.getStudent().trim());
    }

    private boolean overlaps(Lesson a, Lesson b) {
        return a.getStartTime().isBefore(b.getEndTime()) && b.getStartTime().isBefore(a.getEndTime());
    }

    // ---- write-time prevention ---------------------------------------------------------------

    @Transactional
    public Lesson create(LessonRequest request) {
        Room room = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + request.getRoomId()));
        Tutor tutor = tutorRepository.findByIdForUpdate(request.getTutorId())
                .orElseThrow(() -> new NoSuchElementException("Tutor not found: " + request.getTutorId()));
        lessonRepository.lockStudent(request.getStudent().trim().toLowerCase());

        Lesson candidate = new Lesson();
        candidate.setDate(request.getDate());
        candidate.setStartTime(request.getStartTime());
        candidate.setDurationMin(request.getDurationMin());
        candidate.setStudent(request.getStudent());
        candidate.setTutorId(tutor.getId());
        candidate.setRoomId(room.getId());
        candidate.setNote(request.getNote());
        candidate.setStatus(Lesson.Status.BOOKED);

        List<Lesson> existing = lessonRepository.findByDateAndStatusIn(request.getDate(), OCCUPYING);
        validateAgainstExisting(candidate, existing);

        return lessonRepository.save(candidate);
    }

    @Transactional
    public Lesson reschedule(Long id, RescheduleRequest request) {
        Lesson original = lessonRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Lesson not found: " + id));

        Room room = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new NoSuchElementException("Room not found: " + request.getRoomId()));
        Tutor tutor = tutorRepository.findByIdForUpdate(request.getTutorId())
                .orElseThrow(() -> new NoSuchElementException("Tutor not found: " + request.getTutorId()));
        lessonRepository.lockStudent(original.getStudent().trim().toLowerCase());

        Lesson candidate = new Lesson();
        candidate.setDate(request.getDate());
        candidate.setStartTime(request.getStartTime());
        candidate.setDurationMin(request.getDurationMin());
        candidate.setStudent(original.getStudent());
        candidate.setTutorId(tutor.getId());
        candidate.setRoomId(room.getId());
        candidate.setNote(request.getNote());
        candidate.setStatus(Lesson.Status.BOOKED);
        candidate.setMovedFromLessonId(original.getId());

        List<Lesson> existing = lessonRepository.findByDateAndStatusIn(request.getDate(), OCCUPYING).stream()
                .filter(l -> !l.getId().equals(original.getId()))
                .toList();
        validateAgainstExisting(candidate, existing);

        original.setStatus(Lesson.Status.MOVED);
        lessonRepository.save(original);
        return lessonRepository.save(candidate);
    }

    @Transactional
    public CancelResult cancel(Long id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Lesson not found: " + id));
        LocalDateTime now = nowProvider.now();
        LocalDateTime lessonStart = lesson.getDate().atTime(lesson.getStartTime());
        boolean chargeable = !now.isBefore(lessonStart.minusHours(4));

        lesson.setStatus(Lesson.Status.CANCELLED);
        lesson.setCancelledAt(now);
        return new CancelResult(lessonRepository.save(lesson), chargeable);
    }

    private void validateAgainstExisting(Lesson candidate, List<Lesson> existing) {
        List<ConflictDto> conflicts = new ArrayList<>();

        if (candidate.getDate().getDayOfWeek() == DayOfWeek.MONDAY) {
            conflicts.add(new ConflictDto(ConflictType.CLOSED_DAY, List.of(),
                    "The centre is closed on Mondays"));
        }

        for (Lesson other : existing) {
            if (!overlaps(candidate, other)) continue;

            boolean sameRoom = candidate.getRoomId().equals(other.getRoomId());
            boolean sameTutor = candidate.getTutorId().equals(other.getTutorId());
            boolean sameStudent = sameStudent(candidate, other);
            boolean examPairSlot = sameRoom && sameTutor
                    && candidate.getStartTime().equals(other.getStartTime())
                    && candidate.getDurationMin().equals(other.getDurationMin())
                    && !sameStudent;

            if (sameStudent) {
                String otherTutorName = tutorRepository.findById(other.getTutorId())
                        .map(Tutor::getName)
                        .orElse("Tutor " + other.getTutorId());
                conflicts.add(new ConflictDto(ConflictType.STUDENT_DOUBLE_BOOKED, List.of(other.getId()),
                        candidate.getStudent() + " already has an overlapping lesson with tutor " + otherTutorName
                                + " at " + other.getStartTime() + "–" + other.getEndTime()));
            }
            if (sameRoom && !examPairSlot) {
                conflicts.add(new ConflictDto(ConflictType.ROOM_DOUBLE_BOOKED, List.of(other.getId()),
                        "Room " + candidate.getRoomId() + " is already booked (lesson " + other.getId() + ")"));
            }
            if (sameTutor && !examPairSlot) {
                conflicts.add(new ConflictDto(ConflictType.TUTOR_DOUBLE_BOOKED, List.of(other.getId()),
                        "Tutor " + candidate.getTutorId() + " is already booked (lesson " + other.getId() + ")"));
            }
            if (examPairSlot) {
                long sameSlotCount = existing.stream()
                        .filter(l -> l.getRoomId().equals(candidate.getRoomId())
                                && l.getTutorId().equals(candidate.getTutorId())
                                && l.getStartTime().equals(candidate.getStartTime())
                                && l.getDurationMin().equals(candidate.getDurationMin()))
                        .count();
                if (sameSlotCount >= 2) {
                    conflicts.add(new ConflictDto(ConflictType.ROOM_DOUBLE_BOOKED, List.of(other.getId()),
                            "Room " + candidate.getRoomId() + " already has a paired lesson in this slot (lesson "
                                    + other.getId() + "); a third lesson isn't allowed"));
                }
            }
        }

        long tutorLoad = existing.stream().filter(l -> l.getTutorId().equals(candidate.getTutorId())).count();
        if (tutorLoad >= MAX_BOOKINGS_PER_TUTOR_PER_DAY) {
            conflicts.add(new ConflictDto(ConflictType.TUTOR_OVERLOADED, List.of(),
                    "Tutor " + candidate.getTutorId() + " already has " + tutorLoad + " lessons on "
                            + candidate.getDate() + " (max " + MAX_BOOKINGS_PER_TUTOR_PER_DAY + "/day)"));
        }

        if (!conflicts.isEmpty()) {
            throw new LessonConflictException(conflicts);
        }
    }
}
