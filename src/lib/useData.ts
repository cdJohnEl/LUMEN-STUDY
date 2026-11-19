"use client";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { fbDb } from "./firebase";

export function useCol<T>(path: string | null, ...constraints: QueryConstraint[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const key = path ?? "";
  useEffect(() => {
    if (!path) return;
    const q = query(collection(fbDb(), path), ...constraints);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as T));
        setLoading(false);
      },
      () => setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, loading };
}

export function useDocData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(fbDb(), path),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...(snap.data() as DocumentData) } as T) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [path]);
  return { data, loading };
}
