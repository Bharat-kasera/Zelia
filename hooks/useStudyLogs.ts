"use client";

import { useState, useEffect } from "react";
import {
  onSnapshot,
  collection,
  query,
  orderBy,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface StudyLog {
  id: string;
  date: string; // "yyyy-MM-dd"
  hours: number;
  minutes: number;
  totalMinutes: number;
  createdAt: Date;
}

export function useStudyLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const col = collection(db, "users", userId, "studyLogs");
    const q = query(col, orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const hours = (d.hours as number) ?? 0;
          const minutes = (d.minutes as number) ?? 0;
          return {
            id: doc.id,
            date: d.date as string,
            hours,
            minutes,
            totalMinutes: hours * 60 + minutes,
            createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
          } satisfies StudyLog;
        });
        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error("Study logs snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { logs, loading };
}
