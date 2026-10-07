import { useEffect, useState, type ReactNode } from "react";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";
import Footer from "../components/common/Footer";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="admin-responsive flex min-h-dvh w-full max-w-full min-w-0 overflow-x-clip bg-(--app-bg) text-(--app-text)">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
        />
      )}

      <div className="flex min-h-dvh min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
        <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-8 xl:px-8">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}