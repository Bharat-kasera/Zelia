import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Status } from "@/types";

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_SUBJECTS = [
  "Aptitude & Reasoning",
  "Engineering Mathematics",
  "Theory of Computation",
  "Algorithms",
  "General English",
  "Compiler Design",
  "Operating System",
  "Computer Organization and Architecture",
  "Programming and Data Structures",
  "Digital Logic",
  "Databases",
  "Computer Networks",
];

/**
 * Seeds initial subjects on FIRST-EVER login only.
 * Skips entirely if ANY subjects already exist in Firestore.
 * Uses server-only reads to avoid stale cache issues.
 */
export async function seedSubjects(userId: string) {
  try {
    // Force server read — if subjects already exist, do nothing
    const snapshot = await getDocsFromServer(subjectsCol(userId));
    if (snapshot.size > 0) return;

    // No subjects at all — this is a brand new user, seed them
    const batch = writeBatch(db);
    SEED_SUBJECTS.forEach((name, index) => {
      const subjectRef = doc(db, "users", userId, "subjects", `seed_${index}`);
      batch.set(subjectRef, {
        name,
        order: index,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    // Server unreachable — skip seeding entirely rather than risk duplicates
    console.warn("seedSubjects: skipped (server unreachable)", error);
  }
}

// ─── Subject CRUD ───────────────────────────────────────────────────────────

/**
 * Returns a reference to the user's subjects collection.
 */
function subjectsCol(userId: string) {
  return collection(db, "users", userId, "subjects");
}

/**
 * Add a new subject for the user.
 */
export async function addSubject(userId: string, name: string, order: number) {
  return addDoc(subjectsCol(userId), {
    name,
    order,
    createdAt: serverTimestamp(),
  });
}

/**
 * Update a subject's name.
 */
export async function updateSubject(
  userId: string,
  subjectId: string,
  data: { name?: string; order?: number }
) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return updateDoc(ref, data);
}

/**
 * Atomically reorder subjects using a batch write.
 * All order updates apply at once — onSnapshot fires only once.
 */
export async function batchUpdateSubjectOrder(
  userId: string,
  orderedIds: string[]
) {
  const batch = writeBatch(db);
  orderedIds.forEach((subjectId, index) => {
    const ref = doc(db, "users", userId, "subjects", subjectId);
    batch.update(ref, { order: index });
  });
  return batch.commit();
}

/**
 * Delete a subject and all its lectures.
 */
export async function deleteSubject(userId: string, subjectId: string) {
  // Delete all lectures under this subject first
  const lecturesSnap = await getDocs(
    query(collection(db, "users", userId, "lectures"), where("subjectId", "==", subjectId))
  );
  const batch = writeBatch(db);
  lecturesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "users", userId, "subjects", subjectId));
  return batch.commit();
}

/**
 * Remove duplicate subjects that have no lectures.
 * Keeps the subject with lectures when duplicates exist.
 */
export async function cleanupDuplicateSubjects(userId: string) {
  const subjectsSnap = await getDocsFromServer(subjectsCol(userId));
  const allLecturesSnap = await getDocs(collection(db, "users", userId, "lectures"));

  // Count lectures per subject
  const lectureCountBySubject = new Map<string, number>();
  for (const lDoc of allLecturesSnap.docs) {
    const subId = lDoc.data().subjectId as string;
    lectureCountBySubject.set(subId, (lectureCountBySubject.get(subId) ?? 0) + 1);
  }

  // Group subjects by name
  const byName = new Map<string, { id: string; lectureCount: number }[]>();
  for (const sDoc of subjectsSnap.docs) {
    const name = (sDoc.data().name as string).trim().toLowerCase();
    const entry = { id: sDoc.id, lectureCount: lectureCountBySubject.get(sDoc.id) ?? 0 };
    byName.set(name, [...(byName.get(name) ?? []), entry]);
  }

  // For each name with duplicates, delete the ones with 0 lectures
  const batch = writeBatch(db);
  let deleteCount = 0;
  for (const [, entries] of byName) {
    if (entries.length <= 1) continue; // No duplicates
    // Sort: keep the one with most lectures
    entries.sort((a, b) => b.lectureCount - a.lectureCount);
    // Delete all except the first (the one with most lectures)
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].lectureCount === 0) {
        batch.delete(doc(db, "users", userId, "subjects", entries[i].id));
        deleteCount++;
      }
    }
  }

  if (deleteCount > 0) {
    await batch.commit();
  }
  return deleteCount;
}

/**
 * Mark a subject as complete with a given date.
 * Resets all revision done arrays.
 */
export async function markSubjectComplete(
  userId: string,
  subjectId: string,
  completedAt: Date
) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return updateDoc(ref, {
    completedAt: Timestamp.fromDate(completedAt),
    notesRevisionsDone: [],
    cpqRevisionsDone: [],
    pyqRevisionsDone: [],
    topicwise1Done: false,
    topicwise2Done: false,
    subjectwiseDone: false,
  });
}

/**
 * Unmark a subject as complete. Clears completion date and revision arrays.
 */
export async function unmarkSubjectComplete(
  userId: string,
  subjectId: string
) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return updateDoc(ref, {
    completedAt: null,
    notesRevisionsDone: [],
    cpqRevisionsDone: [],
    pyqRevisionsDone: [],
    topicwise1Done: false,
    topicwise2Done: false,
    subjectwiseDone: false,
  });
}

/**
 * Mark or unmark a specific revision date as done.
 * Uses arrayUnion/arrayRemove for atomic operations.
 */
export async function toggleRevisionDate(
  userId: string,
  subjectId: string,
  field: "notesRevisionsDone" | "cpqRevisionsDone" | "pyqRevisionsDone",
  dateKey: string,
  done: boolean
) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return updateDoc(ref, {
    [field]: done ? arrayUnion(dateKey) : arrayRemove(dateKey),
  });
}

/**
 * Toggle a per-subject test's done state.
 */
export async function toggleSubjectTest(
  userId: string,
  subjectId: string,
  field: "topicwise1Done" | "topicwise2Done" | "subjectwiseDone",
  value: boolean
) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return updateDoc(ref, { [field]: value });
}

/**
 * Get/set full syllabus test tracking at users/{userId}/config/tests.
 */
function testConfigRef(userId: string) {
  return doc(db, "users", userId, "config", "tests");
}

export async function toggleFullSyllabusTest(
  userId: string,
  dateKey: string,
  done: boolean
) {
  const ref = testConfigRef(userId);
  try {
    await updateDoc(ref, {
      fullSyllabusDone: done ? arrayUnion(dateKey) : arrayRemove(dateKey),
    });
  } catch {
    // Document may not exist yet; create it
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, { fullSyllabusDone: done ? [dateKey] : [] });
  }
}

// ─── Lecture CRUD ───────────────────────────────────────────────────────────

/**
 * Returns a reference to the user's lectures collection.
 */
function lecturesCol(userId: string) {
  return collection(db, "users", userId, "lectures");
}

/**
 * Add a new lecture for a subject.
 */
export async function addLecture(
  userId: string,
  subjectId: string,
  lectureNumber: string,
  topic: string,
  order: number
) {
  return addDoc(lecturesCol(userId), {
    subjectId,
    lectureNumber,
    topic,
    status: "pending" as Status,
    dateWatched: null,
    order,
    createdAt: serverTimestamp(),
  });
}

/**
 * Update a lecture (topic, lectureNumber, status, dateWatched).
 */
export async function updateLecture(
  userId: string,
  lectureId: string,
  data: {
    lectureNumber?: string;
    topic?: string;
    status?: Status;
    dateWatched?: Timestamp | null;
  }
) {
  const ref = doc(db, "users", userId, "lectures", lectureId);
  return updateDoc(ref, data);
}

/**
 * Delete a lecture.
 */
export async function deleteLecture(userId: string, lectureId: string) {
  const ref = doc(db, "users", userId, "lectures", lectureId);
  return deleteDoc(ref);
}

/**
 * Toggle lecture status between "pending" and "done".
 * When toggled to "done", dateWatched is set to today.
 * When toggled to "pending", dateWatched is set to null.
 */
export async function toggleLectureStatus(
  userId: string,
  lectureId: string,
  currentStatus: Status
) {
  const newStatus: Status = currentStatus === "pending" ? "done" : "pending";
  const dateWatched =
    newStatus === "done" ? Timestamp.fromDate(new Date()) : null;

  return updateLecture(userId, lectureId, {
    status: newStatus,
    dateWatched,
  });
}

// ─── Query helpers (used by hooks for onSnapshot) ───────────────────────────

/**
 * Returns a Firestore query for all subjects, ordered by `order`.
 */
export function subjectsQuery(userId: string) {
  return query(subjectsCol(userId), orderBy("order", "asc"));
}

/**
 * Returns a Firestore query for lectures filtered by subjectId.
 * Sorting by `order` is done client-side to avoid needing a composite index.
 */
export function lecturesBySubjectQuery(userId: string, subjectId: string) {
  return query(
    lecturesCol(userId),
    where("subjectId", "==", subjectId)
  );
}

/**
 * Returns a Firestore query for ALL lectures of a user, ordered by `order`.
 * Used for computing dashboard progress counts.
 */
export function allLecturesQuery(userId: string) {
  return query(lecturesCol(userId), orderBy("order", "asc"));
}

// ─── Objective CRUD ─────────────────────────────────────────────────────────

/**
 * Returns a reference to the user's objectives collection.
 */
function objectivesCol(userId: string) {
  return collection(db, "users", userId, "objectives");
}

/**
 * Add a new objective.
 */
export async function addObjective(userId: string, text: string, order: number) {
  return addDoc(objectivesCol(userId), {
    text,
    done: false,
    order,
    createdAt: serverTimestamp(),
  });
}

/**
 * Update an objective's fields.
 */
export async function updateObjective(
  userId: string,
  objectiveId: string,
  data: { text?: string; done?: boolean; order?: number }
) {
  const ref = doc(db, "users", userId, "objectives", objectiveId);
  return updateDoc(ref, data);
}

/**
 * Delete an objective.
 */
export async function deleteObjective(userId: string, objectiveId: string) {
  const ref = doc(db, "users", userId, "objectives", objectiveId);
  return deleteDoc(ref);
}

/**
 * Atomically reorder objectives using a batch write.
 */
export async function batchUpdateObjectiveOrder(
  userId: string,
  orderedIds: string[]
) {
  const batch = writeBatch(db);
  orderedIds.forEach((objectiveId, index) => {
    const ref = doc(db, "users", userId, "objectives", objectiveId);
    batch.update(ref, { order: index });
  });
  return batch.commit();
}

/**
 * Returns a Firestore query for all objectives, ordered by `order`.
 */
export function objectivesQuery(userId: string) {
  return query(objectivesCol(userId), orderBy("order", "asc"));
}

// ─── Rule CRUD ──────────────────────────────────────────────────────────────

/**
 * Returns a reference to the user's rules collection.
 */
function rulesCol(userId: string) {
  return collection(db, "users", userId, "rules");
}

/**
 * Add a new rule.
 */
export async function addRule(userId: string, text: string, order: number) {
  return addDoc(rulesCol(userId), {
    text,
    order,
    createdAt: serverTimestamp(),
  });
}

/**
 * Update a rule's text.
 */
export async function updateRule(
  userId: string,
  ruleId: string,
  data: { text?: string; order?: number }
) {
  const ref = doc(db, "users", userId, "rules", ruleId);
  return updateDoc(ref, data);
}

/**
 * Delete a rule.
 */
export async function deleteRule(userId: string, ruleId: string) {
  const ref = doc(db, "users", userId, "rules", ruleId);
  return deleteDoc(ref);
}

/**
 * Returns a Firestore query for all rules, ordered by `order`.
 */
export function rulesQuery(userId: string) {
  return query(rulesCol(userId), orderBy("order", "asc"));
}

// ─── Study Log CRUD ─────────────────────────────────────────────────────────

/**
 * Save study time for a specific date. Uses date as document ID (upsert).
 */
export async function saveStudyLog(
  userId: string,
  dateKey: string,
  hours: number,
  minutes: number
) {
  const ref = doc(db, "users", userId, "studyLogs", dateKey);
  return setDoc(ref, {
    date: dateKey,
    hours,
    minutes,
    createdAt: serverTimestamp(),
  });
}

/**
 * Delete a study log entry.
 */
export async function deleteStudyLog(userId: string, dateKey: string) {
  const ref = doc(db, "users", userId, "studyLogs", dateKey);
  return deleteDoc(ref);
}
