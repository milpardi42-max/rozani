import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "پنل مدیریت · رزی آتلیه",
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
