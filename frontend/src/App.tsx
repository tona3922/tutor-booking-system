import { useEffect, useMemo, useState } from "react";
import type { Conflict, Lesson, Room, Tutor } from "./api";
import { ApiError, lessonApi, roomApi, tutorApi } from "./api";
import { AddLessonDialog } from "./components/AddLessonDialog";
import { RoomBoard } from "./components/RoomBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONFLICT_LABEL } from "./lib/lesson-status";
import { isMonday } from "./lib/time";

// Matches the backend's pinned NowProvider (service/.../time/NowProvider.java) -- the seed data
// only covers 2026-03-03 through 2026-03-10, so "today" is fixed to a date inside that week.
const PINNED_DATE = "2026-03-06";

// No auth service -- this is a single-user tool, so the signed-in identity is just a constant.
const CURRENT_USER = "Toan Vo";

function App() {
  const [date, setDate] = useState(PINNED_DATE);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([tutorApi.list(), roomApi.list()])
      .then(([t, r]) => {
        setTutors(t);
        setRooms(r);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  const loadSchedule = () => {
    setLoading(true);
    setError(null);
    Promise.all([lessonApi.listForDate(date), lessonApi.conflictsForDate(date)])
      .then(([l, c]) => {
        setLessons(l);
        setConflicts(c);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load schedule",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadSchedule, [date]);

  const closedMonday = isMonday(date);

  const tutorName = useMemo(() => {
    const map = new Map(tutors.map((t) => [t.id, t.name]));
    return (id: number) => map.get(id) ?? `Tutor ${id}`;
  }, [tutors]);

  const roomLabel = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.id, r.label]));
    return (id: number) => map.get(id) ?? `Room ${id}`;
  }, [rooms]);

  const conflictsByLesson = useMemo(() => {
    const map = new Map<number, Conflict[]>();
    for (const conflict of conflicts) {
      for (const id of conflict.lessonIds) {
        map.set(id, [...(map.get(id) ?? []), conflict]);
      }
    }
    return map;
  }, [conflicts]);

  const handleCancel = async (lessonId: number) => {
    setCancelling(lessonId);
    try {
      await lessonApi.cancel(lessonId);
      loadSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel lesson");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Bright Path Schedule
            </h1>
            <p className="text-sm text-muted-foreground">
              Today's lessons, room by room, 1 - 1 with your tutor
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                lang="en-GB"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={() => setDialogOpen(true)} disabled={closedMonday}>
              Add lesson
            </Button>
            <div className="flex flex-col gap-1.5">
              <Label>Signed in as</Label>
              <div className="flex h-8 items-center rounded-lg border border-input px-2.5 text-sm">
                {CURRENT_USER}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {closedMonday && (
          <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            The centre is closed on Mondays &mdash; lessons can't be scheduled
            for this date.
          </div>
        )}

        {conflicts.length > 0 && (
          <Card className="mb-6 ring-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">
                {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}{" "}
                on {date}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {CONFLICT_LABEL[c.type] ?? c.type}
                  </Badge>
                  <span className="text-muted-foreground">{c.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading schedule...
          </p>
        ) : (
          <RoomBoard
            rooms={rooms}
            tutors={tutors}
            lessons={lessons}
            tutorName={tutorName}
            roomLabel={roomLabel}
            conflictsByLesson={conflictsByLesson}
            onCancel={handleCancel}
            onUpdated={loadSchedule}
            cancelling={cancelling}
            currentUser={CURRENT_USER}
          />
        )}

        <AddLessonDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={date}
          tutors={tutors}
          rooms={rooms}
          lessons={lessons}
          currentUser={CURRENT_USER}
          onCreated={loadSchedule}
        />
      </div>
    </div>
  );
}

export default App;
