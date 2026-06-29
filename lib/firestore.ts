import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  getDocs,
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
 * Seeds initial subjects on first login (when user has 0 subjects).
 */
export async function seedSubjects(userId: string) {
  const snapshot = await getDocs(subjectsCol(userId));
  if (snapshot.size > 0) return; // Already has subjects, skip

  const promises = SEED_SUBJECTS.map((name, index) =>
    addDoc(subjectsCol(userId), {
      name,
      order: index,
      createdAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
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
 * Delete a subject.
 */
export async function deleteSubject(userId: string, subjectId: string) {
  const ref = doc(db, "users", userId, "subjects", subjectId);
  return deleteDoc(ref);
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
