import type { Timestamp } from "firebase/firestore";

export type Course = {
  id: string;
  title: string;
  sourceName: string;
  pageCount: number;
  status: "processing" | "ready" | "failed";
  objectives?: string[];
  gaps?: { item: string; note: string }[];
  revisionGuide?: string;
  createdAt?: Timestamp;
};

export type Topic = {
  id: string;
  order: number;
  title: string;
  module: string;
  pageStart: number;
  pageEnd: number;
  keyPoints: string[];
  lesson?: string;
  bestScore?: number; // percentage 0-100
  attempts?: number;
};

export type PublicQuestion = {
  q: string;
  options: string[];
  level: "recall" | "application" | "analysis" | "challenge";
};

export type GradedItem = {
  q: string;
  options: string[];
  chosen: number;
  correct: number;
  explanation: string;
  level: string;
};

export type GradeResult = {
  attemptId: string;
  score: number;
  total: number;
  pct: number;
  items: GradedItem[];
  gaps: string[];
  reteach: string;
};

export type Attempt = {
  id: string;
  courseId: string;
  topicId?: string;
  topicTitle: string;
  courseTitle: string;
  kind: "topic" | "mock";
  score: number;
  total: number;
  pct: number;
  gaps: string[];
  at?: Timestamp;
};

export type Session = {
  id: string;
  title: string;
  courseId?: string;
  topicId?: string;
  startAt: Timestamp;
  durationMin: number;
  remindMin: number;
  done: boolean;
  calendarEventId?: string;
};

export type FocusLog = {
  id: string;
  label: string;
  plannedMin: number;
  actualSec: number;
  distractions: number;
  at?: Timestamp;
};
