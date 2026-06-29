"use client";

import { useState, useEffect } from "react";
import { onSnapshot, type Timestamp } from "firebase/firestore";
import { lecturesBySubjectQuery, allLecturesQuery } from "@/lib/firestore";
import type { Lecture } from "@/types";

function mapLecture(doc: { id: string; data: () => Record<string, unknown> }): Lecture {
  const d = doc.data();
  return {
    id: doc.id,
    subjectId: d.subjectId as string,
    lectureNumber: d.lectureNumber as string,
    topic: d.topic as string,
    status: d.status as Lecture["status"],
    dateWatched: d.dateWatched
      ? (d.dateWatched as Timestamp).toDate()
      : null,
    order: d.order as number,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

function sortByOrder(a: Lecture, b: Lecture): number {
  return a.order - b.order;
}

/**
 * Realtime lectures for a specific subject.
 */
export function useLectures(
  userId: string | undefined,
  subjectId: string | undefined
) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !subjectId) {
      setLectures([]);
      setLoading(false);
      return;
    }

    const q = lecturesBySubjectQuery(userId, subjectId);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLectures(snapshot.docs.map(mapLecture).sort(sortByOrder));
        setLoading(false);
      },
      (error) => {
        console.error("Lectures snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, subjectId]);

  return { lectures, loading };
}

/**
 * Realtime ALL lectures for a user (used for dashboard progress counts).
 */
export function useAllLectures(userId: string | undefined) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLectures([]);
      setLoading(false);
      return;
    }

    const q = allLecturesQuery(userId);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLectures(snapshot.docs.map(mapLecture).sort(sortByOrder));
        setLoading(false);
      },
      (error) => {
        console.error("All lectures snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { lectures, loading };
}
