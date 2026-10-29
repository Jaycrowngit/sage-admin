"use client";

import { useParams } from "next/navigation";
import { UserDetailView } from "@/components/UserDetailView";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <UserDetailView userId={id} back={{ href: "/students", label: "Back to Students" }} />;
}
