"use client";

import { useState, useEffect } from "react";
import { onSnapshot, type Timestamp } from "firebase/firestore";
import { objectivesQuery } from "@/lib/firestore";
import type { Objective } from "@/types";

export function useObjectives(userId: string | undefined) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setObjectives([]);
      setLoading(false);
      return;
    }

    const q = objectivesQuery(userId);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            text: d.text as string,
            done: d.done as boolean,
            order: d.order as number,
            createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
          } satisfies Objective;
        });
        setObjectives(data);
        setLoading(false);
      },
      (error) => {
        console.error("Objectives snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { objectives, loading };
}
