package com.example.brightpath.dto;

import java.util.List;

public class ConflictDto {

    private final ConflictType type;
    private final List<Long> lessonIds;
    private final String message;

    public ConflictDto(ConflictType type, List<Long> lessonIds, String message) {
        this.type = type;
        this.lessonIds = lessonIds;
        this.message = message;
    }

    public ConflictType getType() {
        return type;
    }

    public List<Long> getLessonIds() {
        return lessonIds;
    }

    public String getMessage() {
        return message;
    }
}
