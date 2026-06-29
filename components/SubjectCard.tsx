"use client";

import Link from "next/link";
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

  const totalLectures = lectures.length;
  const doneLectures = lectures.filter((l) => l.status === "done").length;
  const progressPercentage =
    totalLectures === 0 ? 0 : Math.round((doneLectures / totalLectures) * 100);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/50 bg-gradient-to-b from-card to-muted/20 transition-all hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="line-clamp-2 text-lg leading-tight">
          {subject.name}
        </CardTitle>
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
      <CardFooter className="pt-0">
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/subject/${subject.id}`}>View Lectures</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
