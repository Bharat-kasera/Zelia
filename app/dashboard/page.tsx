"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { seedSubjects, batchUpdateSubjectOrder, cleanupDuplicateSubjects } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { SubjectCard } from "@/components/SubjectCard";
import { AddSubjectDialog } from "@/components/AddSubjectDialog";
import type { Subject } from "@/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const seededRef = useRef(false);

  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  const syncBlockedUntil = useRef(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !seededRef.current) {
      seededRef.current = true;
      // Seed only for brand-new users, then clean up any existing duplicates
      seedSubjects(user.uid)
        .then(() => cleanupDuplicateSubjects(user.uid))
        .catch(console.error);
    }
  }, [user]);

  const { subjects, loading: subjectsLoading } = useSubjects(user?.uid);

  // Sync Firestore → local state, but skip during cooldown after drag
  useEffect(() => {
    if (Date.now() < syncBlockedUntil.current) return;
    setLocalSubjects(subjects);
  }, [subjects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !user) return;

      const oldIndex = localSubjects.findIndex((s) => s.id === active.id);
      const newIndex = localSubjects.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localSubjects, oldIndex, newIndex);

      // Block Firestore sync for 3 seconds so intermediate snapshots don't flicker
      syncBlockedUntil.current = Date.now() + 3000;

      // Optimistic update
      setLocalSubjects(reordered);

      // Atomic batch write — Firestore applies all order changes at once
      await batchUpdateSubjectOrder(
        user.uid,
        reordered.map((s) => s.id)
      );
    },
    [localSubjects, user]
  );

  if (authLoading || (user && subjectsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  const nextOrder =
    localSubjects.length > 0
      ? localSubjects[localSubjects.length - 1].order + 1
      : 0;

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

        {localSubjects.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">No subjects yet</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Add your first subject to start tracking your lectures and
              progress.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localSubjects.map((s) => s.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {localSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    userId={user.uid}
                    subject={subject}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <AddSubjectDialog nextOrder={nextOrder} />
      </main>
    </>
  );
}
