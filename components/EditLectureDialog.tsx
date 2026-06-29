"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLecture } from "@/lib/firestore";
import type { Lecture } from "@/types";

interface EditLectureDialogProps {
  userId: string;
  lecture: Lecture;
}

export function EditLectureDialog({ userId, lecture }: EditLectureDialogProps) {
  const [open, setOpen] = useState(false);
  const [lectureNumber, setLectureNumber] = useState(lecture.lectureNumber);
  const [topic, setTopic] = useState(lecture.topic);
  const [loading, setLoading] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset to current values when opening
      setLectureNumber(lecture.lectureNumber);
      setTopic(lecture.topic);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureNumber.trim() || !topic.trim()) return;

    setLoading(true);
    try {
      await updateLecture(userId, lecture.id, {
        lectureNumber: lectureNumber.trim(),
        topic: topic.trim(),
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to update lecture:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Lecture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="editLectureNumber">Lecture Number</Label>
            <Input
              id="editLectureNumber"
              placeholder="e.g. L13"
              value={lectureNumber}
              onChange={(e) => setLectureNumber(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editTopic">Topic</Label>
            <Input
              id="editTopic"
              placeholder="e.g. Context Free Grammar"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
