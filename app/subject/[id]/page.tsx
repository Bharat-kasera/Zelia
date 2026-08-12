"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { useLectures } from "@/hooks/useLectures";
import { markSubjectComplete, unmarkSubjectComplete } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { LectureTable } from "@/components/LectureTable";
import { AddLectureDialog } from "@/components/AddLectureDialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const subjectId = params.id;
  const { subjects, loading: subjectsLoading } = useSubjects(user?.uid);
  const { lectures, loading: lecturesLoading } = useLectures(
    user?.uid,
    subjectId
  );

  const [calendarOpen, setCalendarOpen] = useState(false);

  // Loading state
  if (authLoading || (user && (subjectsLoading || lecturesLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <h2 className="text-xl font-semibold">Subject not found</h2>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 size-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  const nextOrder =
    lectures.length > 0 ? lectures[lectures.length - 1].order + 1 : 0;

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    await markSubjectComplete(user.uid, subjectId, date);
    setCalendarOpen(false);
  };

  const handleUnmark = async () => {
    await unmarkSubjectComplete(user.uid, subjectId);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {/* Back button + heading */}
        <div className="mb-8 flex flex-col gap-4">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              {subject.name}
            </h1>
            <div className="flex items-center gap-2">
              {/* Completion status */}
              {subject.completedAt ? (
                <div className="flex items-center gap-2">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-green-600/30 bg-green-950/20 text-green-400 hover:bg-green-950/30 hover:text-green-300"
                      >
                        <CheckCircle2 className="size-4" />
                        Completed {format(subject.completedAt, "dd MMM yyyy")}
                        <CalendarIcon className="size-3.5 text-green-400/60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={subject.completedAt ?? undefined}
                        onSelect={handleDateSelect}
                        disabled={{ after: new Date(2027, 0, 31) }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground/50 hover:text-destructive"
                    onClick={handleUnmark}
                    title="Remove completion"
                  >
                    <XCircle className="size-4" />
                  </Button>
                </div>
              ) : (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CheckCircle2 className="size-4" />
                      Mark Complete
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      onSelect={handleDateSelect}
                      disabled={{ after: new Date(2027, 0, 31) }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              )}

              <AddLectureDialog
                userId={user.uid}
                subjectId={subjectId}
                nextOrder={nextOrder}
                existingLectures={lectures}
              />
            </div>
          </div>
        </div>

        {/* Lecture table */}
        <LectureTable userId={user.uid} lectures={lectures} />
      </main>
    </>
  );
}
