import { useState, type ReactNode } from "react";

import WorkerSidebar from "../components/worker/WorkerSidebar";
import WorkerNavbar from "../components/worker/WorkerNavbar";
import Footer from "../components/common/Footer";

import { ProfileProvider } from "../context/ProfileContext";

interface WorkerLayoutProps {
  children: ReactNode;
}

export default function WorkerLayout({ children }: WorkerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <ProfileProvider>
      <div className="flex min-h-screen bg-slate-100">
        {/* Desktop and mobile sidebar */}
        <WorkerSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        {/* Dark background overlay on mobile */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkerNavbar onMenuClick={openSidebar} />

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </ProfileProvider>
  );
}