import type { ReactNode } from "react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";
import Footer from "../components/common/Footer";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">

      <AdminSidebar />

      <div className="flex-1 flex flex-col">

        <AdminNavbar />

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>

        <Footer />

      </div>

    </div>
  );
}