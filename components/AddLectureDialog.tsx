"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import type { Lecture } from "@/types";

interface AddLectureDialogProps {
  userId: string;
  subjectId: string;
  nextOrder: number;
  existingLectures: Lecture[];
}

export function AddLectureDialog({
  userId,
  subjectId,
  nextOrder,
  existingLectures,
}: AddLectureDialogProps) {
  const [open, setOpen] = useState(false);
  const [lectureNumber, setLectureNumber] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get unique topics from existing lectures for suggestions
  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>();
    existingLectures.forEach((l) => {
      if (l.topic.trim()) topics.add(l.topic.trim());
    });
    return Array.from(topics);
  }, [existingLectures]);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!topic.trim()) return uniqueTopics;
    const lower = topic.toLowerCase();
    return uniqueTopics.filter((t) => t.toLowerCase().includes(lower));
  }, [topic, uniqueTopics]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const selectSuggestion = (suggestion: string) => {
    setTopic(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
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
          <div className="relative flex flex-col gap-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              ref={inputRef}
              placeholder="e.g. Context Free Grammar"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              required
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
              >
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Lecture"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
