import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { fbDb } from "./firebase";

export async function deleteCourse(uid: string, courseId: string) {
  const db = fbDb();
  for (const sub of ["topics", "chunks"]) {
    const snap = await getDocs(collection(db, `users/${uid}/courses/${courseId}/${sub}`));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(doc(db, `users/${uid}/courses/${courseId}`));
}
