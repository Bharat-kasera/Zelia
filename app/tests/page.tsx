"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { addDays } from "date-fns";
import { CheckCircle2, Lock, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { useTestConfig } from "@/hooks/useTestConfig";
import { toggleSubjectTest, toggleFullSyllabusTest } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Tests Page ─────────────────────────────────────────────────────────────

const FULL_SYLLABUS_TESTS = [
  { dateKey: "2027-01-07", label: "Full Syllabus Test 1", detail: "180 Mins · 65 Questions" },
  { dateKey: "2027-01-14", label: "Full Syllabus Test 2", detail: "180 Mins · 65 Questions" },
  { dateKey: "2027-01-21", label: "Full Syllabus Test 3", detail: "180 Mins · 65 Questions" },
  { dateKey: "2027-01-28", label: "Full Syllabus Test 4", detail: "180 Mins · 65 Questions" },
];

export default function TestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const { subjects, loading: subjectsLoading } = useSubjects(user?.uid);
  const { fullSyllabusDone, loading: testConfigLoading } = useTestConfig(user?.uid);

  if (authLoading || (user && (subjectsLoading || testConfigLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Stats
  const completedSubjects = subjects.filter((s) => s.completedAt);
  const topicwiseDone = completedSubjects.filter((s) => s.topicwise1Done).length +
    completedSubjects.filter((s) => s.topicwise2Done).length;
  const topicwiseTotal = completedSubjects.length * 2;
  const subjectwiseDone = completedSubjects.filter((s) => s.subjectwiseDone).length;
  const subjectwiseTotal = completedSubjects.length;
  const fsDone = fullSyllabusDone.length;
  const totalDone = topicwiseDone + subjectwiseDone + fsDone;
  const totalTests = topicwiseTotal + subjectwiseTotal + 4;

  const handleToggleSubjectTest = async (
    subjectId: string,
    field: "topicwise1Done" | "topicwise2Done" | "subjectwiseDone",
    currentValue: boolean
  ) => {
    await toggleSubjectTest(user.uid, subjectId, field, !currentValue);
  };

  const handleToggleFS = async (dateKey: string, currentDone: boolean) => {
    await toggleFullSyllabusTest(user.uid, dateKey, !currentDone);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Tests</h1>
          <p className="text-muted-foreground">
            {totalTests === 0
              ? "Complete subjects to unlock tests."
              : `${totalDone} of ${totalTests} tests completed`}
          </p>
        </div>

        {/* ── Topicwise Tests ─────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topicwise Tests</h2>
            <span className="text-xs text-muted-foreground">
              45 Mins · 17 Questions each
            </span>
          </div>

          {completedSubjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground/60">
              No subjects completed yet. Mark a subject complete to see its tests.
            </p>
          ) : (
            <div className="flex flex-col">
              {completedSubjects
                .sort((a, b) => a.order - b.order)
                .map((subject) => {
                  const scheduledDate = subject.completedAt
                    ? format(addDays(subject.completedAt, 3), "dd MMM")
                    : "";

                  return (
                    <div key={subject.id} className="border-b border-border/20 last:border-0">
                      {/* Test 1 */}
                      <div className="group flex items-center gap-3 py-3 pl-1">
                        <Checkbox
                          checked={subject.topicwise1Done}
                          onCheckedChange={() =>
                            handleToggleSubjectTest(subject.id, "topicwise1Done", subject.topicwise1Done)
                          }
                          className="shrink-0"
                        />
                        <span className="size-2 shrink-0 rounded-full bg-purple-400" />
                        <span
                          className={`flex-1 text-sm ${
                            subject.topicwise1Done
                              ? "text-muted-foreground/50 line-through"
                              : "text-foreground"
                          }`}
                        >
                          {subject.name} — Test 1
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          {scheduledDate}
                        </span>
                        {subject.topicwise1Done ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground/20" />
                        )}
                      </div>
                      {/* Test 2 */}
                      <div className="group flex items-center gap-3 py-3 pl-1">
                        <Checkbox
                          checked={subject.topicwise2Done}
                          onCheckedChange={() =>
                            handleToggleSubjectTest(subject.id, "topicwise2Done", subject.topicwise2Done)
                          }
                          className="shrink-0"
                        />
                        <span className="size-2 shrink-0 rounded-full bg-purple-400" />
                        <span
                          className={`flex-1 text-sm ${
                            subject.topicwise2Done
                              ? "text-muted-foreground/50 line-through"
                              : "text-foreground"
                          }`}
                        >
                          {subject.name} — Test 2
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          {subject.completedAt
                            ? format(addDays(subject.completedAt, 4), "dd MMM")
                            : ""}
                        </span>
                        {subject.topicwise2Done ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground/20" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Locked subjects */}
          {subjects.filter((s) => !s.completedAt).length > 0 && (
            <div className="mt-2 flex flex-col">
              {subjects
                .filter((s) => !s.completedAt)
                .sort((a, b) => a.order - b.order)
                .map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center gap-3 py-2.5 pl-1 opacity-40"
                  >
                    <Lock className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 text-sm text-muted-foreground">
                      {subject.name} — Complete subject to unlock
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* ── Subjectwise Tests ───────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Subjectwise Tests</h2>
            <span className="text-xs text-muted-foreground">
              90 Mins · 33 Questions each
            </span>
          </div>

          {completedSubjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground/60">
              No subjects completed yet.
            </p>
          ) : (
            <div className="flex flex-col">
              {completedSubjects
                .sort((a, b) => a.order - b.order)
                .map((subject) => (
                  <div
                    key={subject.id}
                    className="group flex items-center gap-3 border-b border-border/20 py-3 pl-1 last:border-0"
                  >
                    <Checkbox
                      checked={subject.subjectwiseDone}
                      onCheckedChange={() =>
                        handleToggleSubjectTest(subject.id, "subjectwiseDone", subject.subjectwiseDone)
                      }
                      className="shrink-0"
                    />
                    <span className="size-2 shrink-0 rounded-full bg-pink-400" />
                    <span
                      className={`flex-1 text-sm ${
                        subject.subjectwiseDone
                          ? "text-muted-foreground/50 line-through"
                          : "text-foreground"
                      }`}
                    >
                      {subject.name}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      {subject.completedAt
                        ? format(addDays(subject.completedAt, 5), "dd MMM")
                        : ""}
                    </span>
                    {subject.subjectwiseDone ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/20" />
                    )}
                  </div>
                ))}
            </div>
          )}

          {subjects.filter((s) => !s.completedAt).length > 0 && (
            <div className="mt-2 flex flex-col">
              {subjects
                .filter((s) => !s.completedAt)
                .sort((a, b) => a.order - b.order)
                .map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center gap-3 py-2.5 pl-1 opacity-40"
                  >
                    <Lock className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 text-sm text-muted-foreground">
                      {subject.name} — Complete subject to unlock
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* ── Full Syllabus Tests ─────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Full Syllabus Tests</h2>
            <span className="text-xs text-muted-foreground">
              180 Mins · 65 Questions each
            </span>
          </div>

          <div className="flex flex-col">
            {FULL_SYLLABUS_TESTS.map((test) => {
              const done = fullSyllabusDone.includes(test.dateKey);
              return (
                <div
                  key={test.dateKey}
                  className="group flex items-center gap-3 border-b border-border/20 py-3 pl-1 last:border-0"
                >
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => handleToggleFS(test.dateKey, done)}
                    className="shrink-0"
                  />
                  <span className="size-2 shrink-0 rounded-full bg-red-400" />
                  <span
                    className={`flex-1 text-sm ${
                      done
                        ? "text-muted-foreground/50 line-through"
                        : "text-foreground"
                    }`}
                  >
                    {test.label}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {format(new Date(test.dateKey), "dd MMM yyyy")}
                  </span>
                  {done ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/20" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
