"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { useLectures } from "@/hooks/useLectures";
import { Navbar } from "@/components/Navbar";
import { LectureTable } from "@/components/LectureTable";
import { AddLectureDialog } from "@/components/AddLectureDialog";
import { Button } from "@/components/ui/button";

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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              {subject.name}
            </h1>
            <AddLectureDialog
              userId={user.uid}
              subjectId={subjectId}
              nextOrder={nextOrder}
            />
          </div>
        </div>

        {/* Lecture table */}
        <LectureTable userId={user.uid} lectures={lectures} />
      </main>
    </>
  );
}
