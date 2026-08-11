package com.example.brightpath.service;

import com.example.brightpath.dto.ConflictDto;

import java.util.List;

/** Raised when creating/rescheduling a lesson would create a conflict; carries what it collided with. */
public class LessonConflictException extends RuntimeException {

    private final List<ConflictDto> conflicts;

    public LessonConflictException(List<ConflictDto> conflicts) {
        super(conflicts.stream().map(ConflictDto::getMessage).reduce((a, b) -> a + "; " + b).orElse("Conflict"));
        this.conflicts = conflicts;
    }

    public List<ConflictDto> getConflicts() {
        return conflicts;
    }
}
