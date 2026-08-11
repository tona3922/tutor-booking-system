package com.example.brightpath.dto;

import com.example.brightpath.model.Lesson;

public class CancelResult {

    private final Lesson lesson;
    private final boolean chargeable;

    public CancelResult(Lesson lesson, boolean chargeable) {
        this.lesson = lesson;
        this.chargeable = chargeable;
    }

    public Lesson getLesson() {
        return lesson;
    }

    public boolean isChargeable() {
        return chargeable;
    }
}
