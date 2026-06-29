"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { seedSubjects } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { SubjectCard } from "@/components/SubjectCard";
import { AddSubjectDialog } from "@/components/AddSubjectDialog";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const seededRef = useRef(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Seed subjects on first login
  useEffect(() => {
    if (user && !seededRef.current) {
      seededRef.current = true;
      seedSubjects(user.uid).catch(console.error);
    }
  }, [user]);

  const { subjects, loading: subjectsLoading } = useSubjects(user?.uid);

  if (authLoading || (user && subjectsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null; // Wait for redirect

  const nextOrder = subjects.length > 0 ? subjects[subjects.length - 1].order + 1 : 0;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Subjects</h1>
          <p className="text-muted-foreground">
            Manage your GATE 2027 CSE lectures.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">No subjects yet</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Add your first subject to start tracking your lectures and progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} userId={user.uid} subject={subject} />
            ))}
          </div>
        )}

        <AddSubjectDialog nextOrder={nextOrder} />
      </main>
    </>
  );
}
