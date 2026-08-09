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
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useObjectives } from "@/hooks/useObjectives";
import {
  addObjective,
  updateObjective,
  deleteObjective,
  batchUpdateObjectiveOrder,
} from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Objective } from "@/types";

// ─── Sortable Objective Item ────────────────────────────────────────────────

function ObjectiveItem({
  objective,
  userId,
}: {
  objective: Objective;
  userId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: objective.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : ("auto" as const),
    position: "relative" as const,
  };

  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    await updateObjective(userId, objective.id, { done: !objective.done });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteObjective(userId, objective.id);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 border-b border-border/30 py-3.5 last:border-0 ${
        isDragging ? "bg-muted/20" : ""
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Checkbox
        checked={objective.done}
        onCheckedChange={handleToggle}
        className="shrink-0"
      />

      <span
        className={`flex-1 text-lg leading-relaxed ${
          objective.done
            ? "text-muted-foreground/50 line-through"
            : "text-foreground/85"
        }`}
      >
        {objective.text}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="size-3" />
      </Button>
    </li>
  );
}

// ─── Objectives Page ────────────────────────────────────────────────────────

export default function ObjectivesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [localObjectives, setLocalObjectives] = useState<Objective[]>([]);
  const syncBlockedUntil = useRef(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const { objectives, loading: objectivesLoading } = useObjectives(user?.uid);

  // Sync Firestore → local state, but skip during cooldown after drag
  useEffect(() => {
    if (Date.now() < syncBlockedUntil.current) return;
    setLocalObjectives(objectives);
  }, [objectives]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !user) return;

      const oldIndex = localObjectives.findIndex((o) => o.id === active.id);
      const newIndex = localObjectives.findIndex((o) => o.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localObjectives, oldIndex, newIndex);

      syncBlockedUntil.current = Date.now() + 3000;
      setLocalObjectives(reordered);

      await batchUpdateObjectiveOrder(
        user.uid,
        reordered.map((o) => o.id)
      );
    },
    [localObjectives, user]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !user) return;

    setAdding(true);
    const nextOrder =
      localObjectives.length > 0
        ? localObjectives[localObjectives.length - 1].order + 1
        : 0;

    await addObjective(user.uid, newText.trim(), nextOrder);
    setNewText("");
    setAdding(false);
    setDialogOpen(false);
  };

  if (authLoading || (user && objectivesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  const doneCount = localObjectives.filter((o) => o.done).length;
  const totalCount = localObjectives.length;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Objectives</h1>
          <p className="text-muted-foreground">
            {totalCount === 0
              ? "Add tasks to stay on track."
              : `${doneCount} of ${totalCount} completed`}
          </p>
        </div>

        {localObjectives.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localObjectives.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="list-none pl-0">
                {localObjectives.map((objective) => (
                  <ObjectiveItem
                    key={objective.id}
                    objective={objective}
                    userId={user.uid}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground/60">
              No objectives yet. Tap + to add your first one.
            </p>
          </div>
        )}
      </main>

      {/* FAB — fixed bottom right */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 size-12 rounded-full shadow-lg"
          >
            <Plus className="size-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Objective</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Input
              placeholder="e.g. Complete TOC PYQs"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" disabled={adding || !newText.trim()} className="w-full">
              {adding ? "Adding..." : "Add Objective"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
