"use client";

import { useState, useEffect } from "react";
import { onSnapshot, type Timestamp } from "firebase/firestore";
import { rulesQuery } from "@/lib/firestore";
import type { Rule } from "@/types";

export function useRules(userId: string | undefined) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRules([]);
      setLoading(false);
      return;
    }

    const q = rulesQuery(userId);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            text: d.text as string,
            order: d.order as number,
            createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
          } satisfies Rule;
        });
        setRules(data);
        setLoading(false);
      },
      (error) => {
        console.error("Rules snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { rules, loading };
}
