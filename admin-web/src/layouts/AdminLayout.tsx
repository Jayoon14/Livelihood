import type { ReactNode } from "react";

import AdminSidebar from "./AdminSidebar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

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

        <Navbar />

        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>

        <Footer />

      </div>

    </div>
  );
}