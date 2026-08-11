package com.example.brightpath.time;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * The seed data covers 2026-03-03 through 2026-03-10. "Now" is pinned to
 * 2026-03-06 09:00 (a Friday inside that week, and the day the tutor-load cap is broken in the
 * seed data) rather than the real clock, per the brief's instruction to pin a date and say which
 * one. Centralised here so the pin only needs to change in one place.
 */
@Component
public class NowProvider {

    private static final LocalDateTime PINNED_NOW = LocalDateTime.of(2026, 3, 6, 9, 0);

    public LocalDateTime now() {
        return PINNED_NOW;
    }

    public LocalDate today() {
        return PINNED_NOW.toLocalDate();
    }
}
