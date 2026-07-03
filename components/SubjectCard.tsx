"use client";

import Link from "next/link";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useLectures } from "@/hooks/useLectures";
import type { Subject } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
  userId: string;
  subject: Subject;
}

export function SubjectCard({ userId, subject }: SubjectCardProps) {
  const { lectures, loading } = useLectures(userId, subject.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: subject.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
    position: "relative" as const,
  };

  const totalLectures = lectures.length;
  const doneLectures = lectures.filter((l) => l.status === "done").length;
  const progressPercentage =
    totalLectures === 0 ? 0 : Math.round((doneLectures / totalLectures) * 100);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`flex h-full flex-col overflow-hidden border-border/50 bg-gradient-to-b from-card to-muted/20 ${
          isDragging ? "shadow-2xl ring-2 ring-primary/30" : ""
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg leading-tight">
              {subject.name}
            </CardTitle>
            <button
              type="button"
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {loading ? (
            <div className="flex h-12 items-center justify-center">
              <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  {doneLectures} / {totalLectures} Done
                </span>
                <span className="font-semibold text-primary">
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/subject/${subject.id}`}>View Lectures</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
