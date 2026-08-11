import { useState } from "react";
import type { Conflict, Lesson, Room, Tutor } from "../api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABEL, statusVariant } from "../lib/lesson-status";
import { addMinutesToTime, formatTime } from "../lib/time";
import { sameName } from "../lib/user";
import { EditLessonDialog } from "./EditLessonDialog";
import { LessonDetailsDialog } from "./LessonDetailsDialog";

interface Props {
  rooms: Room[];
  tutors: Tutor[];
  lessons: Lesson[];
  tutorName: (id: number) => string;
  roomLabel: (id: number) => string;
  conflictsByLesson: Map<number, Conflict[]>;
  onCancel: (id: number) => void;
  onUpdated: () => void;
  cancelling: number | null;
  currentUser: string;
}

export function RoomBoard({
  rooms,
  tutors,
  lessons,
  tutorName,
  roomLabel,
  conflictsByLesson,
  onCancel,
  onUpdated,
  cancelling,
  currentUser,
}: Props) {
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rooms.map((room) => {
          const roomLessons = lessons
            .filter(
              (l) =>
                l.roomId === room.id &&
                l.status !== "CANCELLED" &&
                l.status !== "MOVED",
            )
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle>{room.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y p-0">
                {roomLessons.length === 0 && (
                  <p className="px-(--card-spacing) py-4 text-sm text-muted-foreground">
                    No lessons scheduled.
                  </p>
                )}
                {roomLessons.map((lesson) => {
                  const lessonConflicts =
                    conflictsByLesson.get(lesson.id) ?? [];
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setSelected(lesson)}
                      className={`flex w-full items-center gap-3 px-(--card-spacing) py-2.5 text-left transition-colors hover:bg-muted/50 ${
                        lessonConflicts.length > 0 ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="flex w-20 shrink-0 flex-col items-start border-r pr-3">
                        <span className="text-sm font-medium">
                          {formatTime(lesson.startTime)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(
                            addMinutesToTime(
                              lesson.startTime,
                              lesson.durationMin,
                            ),
                          )}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm">
                          <span className="text-muted-foreground">Tutor: </span>
                          <span className="font-medium">
                            {tutorName(lesson.tutorId)}
                          </span>
                        </span>
                        <span
                          className={`truncate text-xs ${
                            sameName(lesson.student, currentUser)
                              ? "font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {lesson.student}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {lessonConflicts.length > 0 && (
                          <Badge variant="destructive">!</Badge>
                        )}
                        <Badge variant={statusVariant(lesson.status)}>
                          {STATUS_LABEL[lesson.status]}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LessonDetailsDialog
        lesson={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        tutorName={tutorName}
        roomLabel={roomLabel}
        conflicts={selected ? (conflictsByLesson.get(selected.id) ?? []) : []}
        onCancel={onCancel}
        onEdit={(lesson) => {
          setEditing(lesson);
          setSelected(null);
        }}
        cancelling={cancelling}
        currentUser={currentUser}
      />

      <EditLessonDialog
        lesson={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        tutors={tutors}
        rooms={rooms}
        lessons={lessons}
        onUpdated={onUpdated}
      />
    </>
  );
}
