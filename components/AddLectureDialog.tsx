"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { addLecture } from "@/lib/firestore";

interface AddLectureDialogProps {
  userId: string;
  subjectId: string;
  nextOrder: number;
}

export function AddLectureDialog({
  userId,
  subjectId,
  nextOrder,
}: AddLectureDialogProps) {
  const [open, setOpen] = useState(false);
  const [lectureNumber, setLectureNumber] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureNumber.trim() || !topic.trim()) return;

    setLoading(true);
    try {
      await addLecture(
        userId,
        subjectId,
        lectureNumber.trim(),
        topic.trim(),
        nextOrder
      );
      setLectureNumber("");
      setTopic("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to add lecture:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Add Lecture
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Lecture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lectureNumber">Lecture Number</Label>
            <Input
              id="lectureNumber"
              placeholder="e.g. L13"
              value={lectureNumber}
              onChange={(e) => setLectureNumber(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g. Context Free Grammar"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Lecture"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
