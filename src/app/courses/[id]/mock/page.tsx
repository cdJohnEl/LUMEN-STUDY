"use client";
import { useParams } from "next/navigation";
import { Back, PageTitle } from "@/components/ui";
import Quiz from "@/components/Quiz";

export default function Mock() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="mx-auto max-w-3xl">
      <Back href={`/courses/${id}`} label="Course" />
      <PageTitle title="Mock exam" sub="Mixed questions from every topic, with challenge items." />
      <Quiz courseId={id} kind="mock" label="Mock exam" />
    </div>
  );
}
