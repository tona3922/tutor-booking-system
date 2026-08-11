package com.example.brightpath.controller;

import com.example.brightpath.dto.CancelResult;
import com.example.brightpath.dto.ConflictDto;
import com.example.brightpath.dto.LessonRequest;
import com.example.brightpath.dto.RescheduleRequest;
import com.example.brightpath.model.Lesson;
import com.example.brightpath.service.LessonService;
import com.example.brightpath.time.NowProvider;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class LessonController {

    private final LessonService lessonService;
    private final NowProvider nowProvider;

    public LessonController(LessonService lessonService, NowProvider nowProvider) {
        this.lessonService = lessonService;
        this.nowProvider = nowProvider;
    }

    @GetMapping("/lessons")
    public List<Lesson> listForDate(@RequestParam(required = false) LocalDate date) {
        return lessonService.findByDate(date != null ? date : nowProvider.today());
    }

    @GetMapping("/conflicts")
    public List<ConflictDto> conflictsForDate(@RequestParam(required = false) LocalDate date) {
        return lessonService.detectConflicts(date != null ? date : nowProvider.today());
    }

    @PostMapping("/lessons")
    public ResponseEntity<Lesson> create(@Valid @RequestBody LessonRequest request) {
        Lesson created = lessonService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/lessons/{id}/cancel")
    public CancelResult cancel(@PathVariable Long id) {
        return lessonService.cancel(id);
    }

    @PatchMapping("/lessons/{id}/reschedule")
    public Lesson reschedule(@PathVariable Long id, @Valid @RequestBody RescheduleRequest request) {
        return lessonService.reschedule(id, request);
    }
}
