export type Status = "pending" | "done";

export interface Subject {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
}

export interface Lecture {
  id: string;
  subjectId: string;
  lectureNumber: string; // "L1", "L2" etc.
  topic: string;
  status: Status;
  dateWatched: Date | null;
  order: number;
  createdAt: Date;
}

export interface Objective {
  id: string;
  text: string;
  done: boolean;
  order: number;
  createdAt: Date;
}
