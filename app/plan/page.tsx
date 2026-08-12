"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  format,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { useTestConfig } from "@/hooks/useTestConfig";
import {
  toggleRevisionDate,
  toggleSubjectTest,
  toggleFullSyllabusTest,
} from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Subject } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

type RevisionType = "notes" | "cpq" | "pyq";
type TestType = "topicwise1" | "topicwise2" | "subjectwise" | "fullSyllabus";
type EventType = RevisionType | TestType;

interface CalendarEvent {
  id: string;
  label: string;
  subLabel: string;
  date: Date;
  dateKey: string;
  done: boolean;
  eventType: EventType;
  // For toggling
  subjectId?: string;
  revisionField?: "notesRevisionsDone" | "cpqRevisionsDone" | "pyqRevisionsDone";
  testField?: "topicwise1Done" | "topicwise2Done" | "subjectwiseDone";
}

// ─── Config ─────────────────────────────────────────────────────────────────

const REVISION_CONFIG = [
  {
    type: "notes" as RevisionType,
    intervalDays: 30,
    field: "notesRevisionsDone" as const,
    label: "Notes Revision",
    shortLabel: "Notes",
  },
  {
    type: "cpq" as RevisionType,
    intervalDays: 45,
    field: "cpqRevisionsDone" as const,
    label: "CPQ Revision",
    shortLabel: "CPQ",
  },
  {
    type: "pyq" as RevisionType,
    intervalDays: 60,
    field: "pyqRevisionsDone" as const,
    label: "PYQ Revision",
    shortLabel: "PYQ",
  },
];

const TEST_CONFIG = [
  { type: "topicwise1" as TestType, daysAfter: 3, field: "topicwise1Done" as const, label: "Topicwise Test 1", shortLabel: "T1" },
  { type: "topicwise2" as TestType, daysAfter: 4, field: "topicwise2Done" as const, label: "Topicwise Test 2", shortLabel: "T2" },
  { type: "subjectwise" as TestType, daysAfter: 5, field: "subjectwiseDone" as const, label: "Subjectwise Test", shortLabel: "Sub" },
];

const FULL_SYLLABUS_TESTS = [
  { date: new Date(2027, 0, 7), label: "Full Syllabus Test 1", shortLabel: "FS1" },
  { date: new Date(2027, 0, 14), label: "Full Syllabus Test 2", shortLabel: "FS2" },
  { date: new Date(2027, 0, 21), label: "Full Syllabus Test 3", shortLabel: "FS3" },
  { date: new Date(2027, 0, 28), label: "Full Syllabus Test 4", shortLabel: "FS4" },
];

const EVENT_STYLES: Record<EventType, { bgColor: string; textColor: string; dotColor: string }> = {
  notes: { bgColor: "bg-emerald-500/15", textColor: "text-emerald-400", dotColor: "bg-emerald-400" },
  cpq: { bgColor: "bg-blue-500/15", textColor: "text-blue-400", dotColor: "bg-blue-400" },
  pyq: { bgColor: "bg-orange-500/15", textColor: "text-orange-400", dotColor: "bg-orange-400" },
  topicwise1: { bgColor: "bg-purple-500/15", textColor: "text-purple-400", dotColor: "bg-purple-400" },
  topicwise2: { bgColor: "bg-purple-500/15", textColor: "text-purple-400", dotColor: "bg-purple-400" },
  subjectwise: { bgColor: "bg-pink-500/15", textColor: "text-pink-400", dotColor: "bg-pink-400" },
  fullSyllabus: { bgColor: "bg-red-500/15", textColor: "text-red-400", dotColor: "bg-red-400" },
};

const LEGEND = [
  { label: "Notes (every 30d)", color: "bg-emerald-400" },
  { label: "CPQ (every 45d)", color: "bg-blue-400" },
  { label: "PYQ (every 60d)", color: "bg-orange-400" },
  { label: "Topicwise Test", color: "bg-purple-400" },
  { label: "Subjectwise Test", color: "bg-pink-400" },
  { label: "Full Syllabus Test", color: "bg-red-400" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_MONTH = new Date(2026, 7, 1);
const MAX_MONTH = new Date(2027, 0, 1);
const HARD_LIMIT = new Date(2027, 0, 31);

// ─── Plan Page ──────────────────────────────────────────────────────────────

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const { subjects, loading: subjectsLoading } = useSubjects(user?.uid);
  const { fullSyllabusDone, loading: testConfigLoading } = useTestConfig(user?.uid);

  // Build all calendar events
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    for (const subject of subjects) {
      if (!subject.completedAt) continue;

      // Recurring revision events
      for (const config of REVISION_CONFIG) {
        let occurrence = 1;
        while (true) {
          const date = startOfDay(addDays(subject.completedAt, config.intervalDays * occurrence));
          if (date > HARD_LIMIT) break;
          const dateKey = format(date, "yyyy-MM-dd");
          events.push({
            id: `${subject.id}-${config.type}-${dateKey}`,
            label: subject.name,
            subLabel: config.label,
            date,
            dateKey,
            done: subject[config.field].includes(dateKey),
            eventType: config.type,
            subjectId: subject.id,
            revisionField: config.field,
          });
          occurrence++;
        }
      }

      // Per-subject tests (one-time, computed from completedAt)
      for (const config of TEST_CONFIG) {
        const date = startOfDay(addDays(subject.completedAt, config.daysAfter));
        if (date > HARD_LIMIT) continue;
        const dateKey = format(date, "yyyy-MM-dd");
        events.push({
          id: `${subject.id}-${config.type}`,
          label: subject.name,
          subLabel: config.label,
          date,
          dateKey,
          done: subject[config.field],
          eventType: config.type,
          subjectId: subject.id,
          testField: config.field,
        });
      }
    }

    // Full syllabus tests (global, fixed dates)
    for (const fs of FULL_SYLLABUS_TESTS) {
      const dateKey = format(fs.date, "yyyy-MM-dd");
      events.push({
        id: `fullSyllabus-${dateKey}`,
        label: fs.label,
        subLabel: "180 Mins · 65 Questions",
        date: fs.date,
        dateKey,
        done: fullSyllabusDone.includes(dateKey),
        eventType: "fullSyllabus",
      });
    }

    return events;
  }, [subjects, fullSyllabusDone]);

  // Build map: date string → events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of allEvents) {
      if (!map.has(event.dateKey)) map.set(event.dateKey, []);
      map.get(event.dateKey)!.push(event);
    }
    return map;
  }, [allEvents]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Selected date events
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter((e) => isSameDay(e.date, selectedDate));
  }, [allEvents, selectedDate]);

  const handlePrev = () => {
    const prev = subMonths(currentMonth, 1);
    if (prev >= MIN_MONTH) setCurrentMonth(prev);
  };

  const handleNext = () => {
    const next = addMonths(currentMonth, 1);
    if (next <= MAX_MONTH) setCurrentMonth(next);
  };

  const handleToggle = async (event: CalendarEvent) => {
    if (!user) return;

    if (event.eventType === "fullSyllabus") {
      await toggleFullSyllabusTest(user.uid, event.dateKey, !event.done);
    } else if (event.revisionField && event.subjectId) {
      await toggleRevisionDate(user.uid, event.subjectId, event.revisionField, event.dateKey, !event.done);
    } else if (event.testField && event.subjectId) {
      await toggleSubjectTest(user.uid, event.subjectId, event.testField, !event.done);
    }
  };

  if (authLoading || (user && (subjectsLoading || testConfigLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  const completedCount = subjects.filter((s) => s.completedAt).length;
  const canGoPrev = subMonths(currentMonth, 1) >= MIN_MONTH;
  const canGoNext = addMonths(currentMonth, 1) <= MAX_MONTH;
  const today = startOfDay(new Date());

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Plan</h1>
          <p className="text-muted-foreground">
            {completedCount === 0
              ? "Mark subjects as complete to see your revision & test schedule."
              : `${completedCount} subject${completedCount > 1 ? "s" : ""} completed — revisions & tests shown below.`}
          </p>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={handlePrev} disabled={!canGoPrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={handleNext} disabled={!canGoNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="overflow-hidden rounded-xl border border-border/50">
          <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const events = eventsByDate.get(key) ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const todayCell = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasOverdue = events.some(
                (e) => !e.done && isBefore(e.date, today) && !isSameDay(e.date, today)
              );

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex min-h-[100px] flex-col border-b border-r border-border/20 px-1.5 py-1.5 text-left transition-colors hover:bg-muted/20 ${
                    !inMonth ? "opacity-30" : ""
                  } ${isSelected ? "bg-muted/30 ring-1 ring-inset ring-primary/30" : ""} ${
                    hasOverdue ? "bg-red-500/5" : ""
                  }`}
                >
                  <span
                    className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                      todayCell
                        ? "bg-primary text-primary-foreground"
                        : hasOverdue
                          ? "text-red-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    {events.slice(0, 3).map((event) => {
                      const style = EVENT_STYLES[event.eventType];
                      return (
                        <div
                          key={event.id}
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                            event.done
                              ? "bg-muted/40 text-muted-foreground/50 line-through"
                              : `${style.bgColor} ${style.textColor}`
                          }`}
                        >
                          {event.eventType === "fullSyllabus"
                            ? event.label
                            : `${event.label.length > 8 ? event.label.slice(0, 8) + "…" : event.label} · ${
                                event.subLabel.split(" ")[0]
                              }`}
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{events.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail panel */}
        {selectedDate && selectedEvents.length > 0 && (
          <div className="mt-6 rounded-xl border border-border/50 p-5">
            <h3 className="mb-4 text-lg font-semibold">
              {format(selectedDate, "EEEE, dd MMMM yyyy")}
              {isBefore(selectedDate, today) &&
                !isSameDay(selectedDate, today) &&
                selectedEvents.some((e) => !e.done) && (
                  <span className="ml-2 text-sm font-normal text-red-400">
                    (Overdue)
                  </span>
                )}
            </h3>
            <div className="flex flex-col gap-2">
              {selectedEvents.map((event) => {
                const style = EVENT_STYLES[event.eventType];
                const isOverdue =
                  !event.done &&
                  isBefore(event.date, today) &&
                  !isSameDay(event.date, today);

                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/20 ${
                      isOverdue
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-border/30"
                    }`}
                  >
                    <Checkbox
                      checked={event.done}
                      onCheckedChange={() => handleToggle(event)}
                      className="shrink-0"
                    />
                    <span className={`size-2 shrink-0 rounded-full ${style.dotColor}`} />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span
                        className={`text-sm font-medium ${
                          event.done
                            ? "text-muted-foreground/50 line-through"
                            : isOverdue
                              ? "text-red-300"
                              : "text-foreground"
                        }`}
                      >
                        {event.label}
                      </span>
                      <span
                        className={`text-xs ${
                          event.done ? "text-muted-foreground/40" : style.textColor
                        }`}
                      >
                        {event.subLabel}
                        {isOverdue && " · Overdue"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
