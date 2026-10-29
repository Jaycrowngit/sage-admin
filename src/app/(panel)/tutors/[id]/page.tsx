"use client";

import { useParams } from "next/navigation";
import { UserDetailView } from "@/components/UserDetailView";

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <UserDetailView userId={id} back={{ href: "/tutors", label: "Back to Tutors & Staff" }} />;
}
