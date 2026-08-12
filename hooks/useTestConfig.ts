"use client";

import { useState, useEffect } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useTestConfig(userId: string | undefined) {
  const [fullSyllabusDone, setFullSyllabusDone] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFullSyllabusDone([]);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", userId, "config", "tests");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const d = snapshot.data();
          setFullSyllabusDone((d.fullSyllabusDone as string[]) ?? []);
        } else {
          setFullSyllabusDone([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Test config snapshot error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { fullSyllabusDone, loading };
}
