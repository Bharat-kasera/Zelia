export type Status = "pending" | "done";

export interface Subject {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  completedAt: Date | null;
  notesRevisionsDone: string[];
  cpqRevisionsDone: string[];
  pyqRevisionsDone: string[];
  topicwise1Done: boolean;
  topicwise2Done: boolean;
  subjectwiseDone: boolean;
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

export interface Rule {
  id: string;
  text: string;
  order: number;
  createdAt: Date;
}
