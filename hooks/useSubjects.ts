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
