"use client";

import { useState, useEffect } from "react";
import { onSnapshot, type Timestamp } from "firebase/firestore";
import { subjectsQuery } from "@/lib/firestore";
import type { Subject } from "@/types";

export function useSubjects(userId: string | undefined) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    const q = subjectsQuery(userId);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name as string,
            order: d.order as number,
            createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
            completedAt: d.completedAt
              ? (d.completedAt as Timestamp).toDate()
              : null,
            notesRevisionsDone: (d.notesRevisionsDone as string[]) ?? [],
            cpqRevisionsDone: (d.cpqRevisionsDone as string[]) ?? [],
            pyqRevisionsDone: (d.pyqRevisionsDone as string[]) ?? [],
            topicwise1Done: (d.topicwise1Done as boolean) ?? false,
            topicwise2Done: (d.topicwise2Done as boolean) ?? false,
            subjectwiseDone: (d.subjectwiseDone as boolean) ?? false,
          } satisfies Subject;
        });
        setSubjects(data);
        setLoading(false);
      },
      (error) => {
        console.error("Subjects snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { subjects, loading };
}
