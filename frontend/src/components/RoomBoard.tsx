import { useState } from "react";
import type { Conflict, Lesson, Room, Tutor } from "../api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { STATUS_LABEL, statusVariant } from "../lib/lesson-status";
import { addMinutesToTime, formatTime } from "../lib/time";
import { sameName } from "../lib/user";
import { EditLessonForm } from "./EditLessonForm";
import { LessonDetailsView } from "./LessonDetailsView";

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
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState<"details" | "edit">("details");

  const closeModal = () => {
    setActiveLesson(null);
    setMode("details");
  };

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
                      onClick={() => {
                        setActiveLesson(lesson);
                        setMode("details");
                      }}
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

      <Dialog
        open={activeLesson !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {activeLesson &&
            (mode === "details" ? (
              <div key="details" className="animate-in fade-in-0 duration-200">
                <LessonDetailsView
                  lesson={activeLesson}
                  tutorName={tutorName}
                  roomLabel={roomLabel}
                  conflicts={conflictsByLesson.get(activeLesson.id) ?? []}
                  onCancel={onCancel}
                  onEdit={() => setMode("edit")}
                  cancelling={cancelling}
                  currentUser={currentUser}
                />
              </div>
            ) : (
              <div key="edit" className="animate-in fade-in-0 duration-200">
                <EditLessonForm
                  lesson={activeLesson}
                  tutors={tutors}
                  rooms={rooms}
                  lessons={lessons}
                  onSaved={() => {
                    onUpdated();
                    closeModal();
                  }}
                />
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
