"use client";

import { useState } from "react";
import { Trash2, CalendarIcon } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { EditLectureDialog } from "@/components/EditLectureDialog";
import { toggleLectureStatus, deleteLecture, updateLecture } from "@/lib/firestore";
import type { Lecture } from "@/types";

interface LectureTableProps {
  userId: string;
  lectures: Lecture[];
}

export function LectureTable({ userId, lectures }: LectureTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggleStatus = async (lecture: Lecture) => {
    try {
      await toggleLectureStatus(userId, lecture.id, lecture.status);
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleDelete = async (lectureId: string) => {
    setDeletingId(lectureId);
    try {
      await deleteLecture(userId, lectureId);
    } catch (error) {
      console.error("Failed to delete lecture:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDateChange = async (lectureId: string, date: Date | undefined) => {
    if (!date) return;
    try {
      await updateLecture(userId, lectureId, {
        dateWatched: Timestamp.fromDate(date),
      });
    } catch (error) {
      console.error("Failed to update date:", error);
    }
  };

  if (lectures.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold">No lectures yet</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add your first lecture using the button above to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[100px]">#</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[160px]">Date Watched</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lectures.map((lecture) => (
            <TableRow key={lecture.id}>
              {/* Lecture Number */}
              <TableCell className="font-medium">
                {lecture.lectureNumber}
              </TableCell>

              {/* Topic */}
              <TableCell>{lecture.topic}</TableCell>

              {/* Status Badge — clickable to toggle */}
              <TableCell>
                <Badge
                  className="cursor-pointer select-none transition-colors"
                  variant={lecture.status === "done" ? "default" : "secondary"}
                  onClick={() => handleToggleStatus(lecture)}
                  style={
                    lecture.status === "done"
                      ? { backgroundColor: "oklch(0.55 0.15 145)", color: "#fff" }
                      : undefined
                  }
                >
                  {lecture.status === "done" ? "Done" : "Pending"}
                </Badge>
              </TableCell>

              {/* Date Watched — shows Popover with Calendar if Done */}
              <TableCell>
                {lecture.status === "done" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1.5 px-2 py-1 text-sm font-normal"
                      >
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        {lecture.dateWatched
                          ? format(lecture.dateWatched, "dd MMM yyyy")
                          : "—"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={lecture.dateWatched ?? undefined}
                        onSelect={(date) =>
                          handleDateChange(lecture.id, date)
                        }
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="px-2 text-sm text-muted-foreground">—</span>
                )}
              </TableCell>

              {/* Actions — Edit + Delete */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <EditLectureDialog userId={userId} lecture={lecture} />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lecture</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          <span className="font-semibold">
                            {lecture.lectureNumber} — {lecture.topic}
                          </span>
                          ? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(lecture.id)}
                          disabled={deletingId === lecture.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === lecture.id
                            ? "Deleting..."
                            : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
